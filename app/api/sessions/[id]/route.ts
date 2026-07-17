import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyAuth } from "@/lib/auth-middleware"
import type { SessionDetailResponse, SessionListItem } from "@/lib/api-types"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = verifyAuth(req)
  if (authError) return authError

  const { id } = await params

  try {
    const session = await prisma.pocSession.findUnique({
      where: { id },
      include: {
        sessionProjects: {
          include: {
            project: {
              select: {
                id: true,
                shortTitle: true,
                classification: true,
                ragOverall: true,
              },
            },
          },
        },
      },
    })

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    const projectIds = session.sessionProjects.map((sp) => sp.projectId)
    const projectTitles: Record<string, string> = {}
    for (const sp of session.sessionProjects) {
      projectTitles[sp.projectId] = sp.project.shortTitle
    }

    const sessionItem: SessionListItem = {
      id: session.id,
      date: session.date.toISOString(),
      committeeType: session.committeeType as SessionListItem["committeeType"],
      projectIds,
      projectTitles,
      status: session.status as SessionListItem["status"],
      attendees: session.attendees,
    }

    const projectSummaries = session.sessionProjects.map((sp) => ({
      id: sp.project.id,
      shortTitle: sp.project.shortTitle,
      classification: sp.project.classification as "A" | "B" | "C",
      ragOverall: (sp.project.ragOverall ?? "GREEN") as "RED" | "AMBER" | "GREEN",
    }))

    const response: SessionDetailResponse = {
      session: sessionItem,
      projectSummaries,
    }

    return NextResponse.json(response)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Failed to load session detail:", message)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
