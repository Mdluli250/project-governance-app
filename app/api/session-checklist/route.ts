import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { prisma } from "@/lib/prisma"
import { verifyAuth } from "@/lib/auth-middleware"
import { canPerformAction } from "@/lib/rules"
import type { User } from "@/lib/types"
import type { ChecklistItemPayload, SessionChecklistResponse } from "@/lib/checklist-persistence-types"

// ── GET: Load checklist state for a session-project pair ───
export async function GET(req: NextRequest) {
  const authError = verifyAuth(req)
  if (authError) return authError

  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get("sessionId")
  const projectId = searchParams.get("projectId")

  if (!sessionId || !projectId) {
    return NextResponse.json(
      { error: "Missing required query parameters: sessionId and projectId" },
      { status: 400 }
    )
  }

  try {
    // Validate that the session-project combination exists
    const sessionProject = await prisma.sessionProject.findUnique({
      where: {
        sessionId_projectId: { sessionId, projectId },
      },
    })

    if (!sessionProject) {
      return NextResponse.json(
        { error: "Not found", message: "This session-project combination is invalid." },
        { status: 404 }
      )
    }

    // Query checklist items for this session-project pair
    const items = await prisma.sessionChecklistItem.findMany({
      where: { sessionId, projectId },
      orderBy: [{ section: "asc" }, { item: "asc" }],
    })

    if (items.length === 0) {
      const response: SessionChecklistResponse = { items: [], updatedAt: null }
      return NextResponse.json(response)
    }

    // Map to payload format and compute max updatedAt
    const payloadItems: ChecklistItemPayload[] = items.map((record) => ({
      section: record.section,
      item: record.item,
      response: (record.response as ChecklistItemPayload["response"]) ?? null,
      comment: record.comment ?? "",
      evidenceLinks: record.evidenceLinks ?? [],
      actionRequired: record.actionRequired ?? false,
    }))

    // Compute the max updatedAt across all items
    const maxUpdatedAt = items.reduce<Date | null>((max, record) => {
      if (!record.updatedAt) return max
      if (!max) return record.updatedAt
      return record.updatedAt > max ? record.updatedAt : max
    }, null)

    const response: SessionChecklistResponse = {
      items: payloadItems,
      updatedAt: maxUpdatedAt ? maxUpdatedAt.toISOString() : null,
    }

    return NextResponse.json(response)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Failed to load session checklist:", message)
    return NextResponse.json(
      { error: "Internal error", details: [message] },
      { status: 500 }
    )
  }
}


// ── PUT: Persist checklist state for a session-project pair ───
export async function PUT(req: NextRequest) {
  const authError = verifyAuth(req)
  if (authError) return authError

  // Decode JWT to get user role
  const secret = process.env.JWT_SECRET
  if (!secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const authHeader = req.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const token = authHeader.slice(7)
  let decoded: { sub: string; email: string; role: string }
  try {
    decoded = jwt.verify(token, secret) as { sub: string; email: string; role: string }
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check COMPLETE_CHECKLIST permission
  if (!canPerformAction({ role: decoded.role } as User, "COMPLETE_CHECKLIST")) {
    return NextResponse.json(
      { error: "Forbidden", message: "You do not have permission to save checklist responses." },
      { status: 403 }
    )
  }

  let body: {
    sessionId: string
    projectId: string
    items: ChecklistItemPayload[]
    updatedAt: string | null
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    )
  }

  const { sessionId, projectId, items, updatedAt } = body

  if (!sessionId || !projectId || !Array.isArray(items)) {
    return NextResponse.json(
      { error: "Missing required fields: sessionId, projectId, and items" },
      { status: 400 }
    )
  }

  try {
    // Validate that the session-project combination exists
    const sessionProject = await prisma.sessionProject.findUnique({
      where: {
        sessionId_projectId: { sessionId, projectId },
      },
    })

    if (!sessionProject) {
      return NextResponse.json(
        { error: "Not found", message: "This session-project combination is invalid." },
        { status: 404 }
      )
    }

    // Check session status is not COMPLETED
    const session = await prisma.pocSession.findUnique({
      where: { id: sessionId },
    })

    if (session?.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Forbidden", message: "Session is completed and locked." },
        { status: 403 }
      )
    }

    // Optimistic concurrency check
    if (updatedAt !== null) {
      const existingItems = await prisma.sessionChecklistItem.findMany({
        where: { sessionId, projectId },
        select: { updatedAt: true },
      })

      if (existingItems.length > 0) {
        const maxUpdatedAt = existingItems.reduce<Date | null>((max, record) => {
          if (!record.updatedAt) return max
          if (!max) return record.updatedAt
          return record.updatedAt > max ? record.updatedAt : max
        }, null)

        if (maxUpdatedAt) {
          const clientUpdatedAt = new Date(updatedAt).getTime()
          const dbUpdatedAt = maxUpdatedAt.getTime()

          if (clientUpdatedAt !== dbUpdatedAt) {
            return NextResponse.json(
              {
                error: "Conflict",
                message: "Another user has updated this checklist. Please reload to see the latest version.",
                latestUpdatedAt: maxUpdatedAt.toISOString(),
              },
              { status: 409 }
            )
          }
        }
      }
    }

    // Upsert each item using the unique constraint
    const upsertPromises = items.map((item) =>
      prisma.sessionChecklistItem.upsert({
        where: {
          uq_session_checklist_item: {
            sessionId,
            projectId,
            section: item.section,
            item: item.item,
          },
        },
        create: {
          sessionId,
          projectId,
          section: item.section,
          item: item.item,
          response: item.response,
          comment: item.comment ?? "",
          evidenceLinks: item.evidenceLinks ?? [],
          actionRequired: item.actionRequired ?? false,
        },
        update: {
          response: item.response,
          comment: item.comment ?? "",
          evidenceLinks: item.evidenceLinks ?? [],
          actionRequired: item.actionRequired ?? false,
        },
      })
    )

    const upsertedItems = await Promise.all(upsertPromises)

    // Compute the new max updatedAt
    const newMaxUpdatedAt = upsertedItems.reduce<Date | null>((max, record) => {
      if (!record.updatedAt) return max
      if (!max) return record.updatedAt
      return record.updatedAt > max ? record.updatedAt : max
    }, null)

    return NextResponse.json({
      success: true,
      updatedAt: newMaxUpdatedAt ? newMaxUpdatedAt.toISOString() : new Date().toISOString(),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Failed to persist session checklist:", message)
    return NextResponse.json(
      { error: "Internal error", details: [message] },
      { status: 500 }
    )
  }
}
