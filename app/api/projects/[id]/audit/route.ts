import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { mapAudit } from "@/lib/prisma-mappers"
import { verifyAuth } from "@/lib/auth-middleware"
import type { AuditPageResponse, ErrorResponse } from "@/lib/api-types"

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 50

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = verifyAuth(request)
  if (authError) return authError

  const { id: projectId } = await params
  const { searchParams } = new URL(request.url)

  const cursor = searchParams.get("cursor") || undefined
  const rawLimit = searchParams.get("limit")
  let limit = rawLimit ? parseInt(rawLimit, 10) : DEFAULT_LIMIT
  if (isNaN(limit) || limit < 1) {
    limit = DEFAULT_LIMIT
  }
  if (limit > MAX_LIMIT) {
    limit = MAX_LIMIT
  }

  try {
    const entries = await prisma.auditLog.findMany({
      where: { projectId },
      orderBy: [{ timestamp: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const hasMore = entries.length > limit
    const pageEntries = hasMore ? entries.slice(0, limit) : entries
    const nextCursor = hasMore ? pageEntries[pageEntries.length - 1].id : null

    const response: AuditPageResponse = {
      entries: pageEntries.map(mapAudit),
      nextCursor,
      hasMore,
    }

    return NextResponse.json(response)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Failed to load audit log:", message)
    return NextResponse.json(
      { error: "Internal server error" } satisfies ErrorResponse,
      { status: 500 }
    )
  }
}
