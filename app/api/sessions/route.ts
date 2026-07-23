import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyAuth } from "@/lib/auth-middleware"
import type { SessionsListResponse, SessionListItem } from "@/lib/api-types"

/**
 * Raw session record as returned from database query with sessionProjects relation.
 */
export interface RawSessionWithProjects {
  id: string
  date: Date
  committeeType: string
  status: string
  attendees: string[]
  sessionProjects: Array<{ projectId: string }>
  // Fields that may exist on full project records but should NOT appear in session list items
  rag?: unknown
  contractValue?: unknown
  actions?: unknown[]
  reviews?: unknown[]
  risks?: unknown[]
  auditLog?: unknown[]
  kdaDecisions?: unknown[]
}

/**
 * Pure function that maps raw session records with their sessionProjects relation
 * and a project title lookup map to SessionListItem[].
 * Extracts only session fields and project titles; excludes full project detail fields.
 */
export function mapSessionsToListItems(
  sessions: RawSessionWithProjects[],
  projectTitleMap: Record<string, string>
): SessionListItem[] {
  return sessions.map((session) => {
    const projectIds = session.sessionProjects.map((sp) => sp.projectId)
    const projectTitles: Record<string, string> = {}
    for (const pid of projectIds) {
      if (projectTitleMap[pid]) {
        projectTitles[pid] = projectTitleMap[pid]
      }
    }

    return {
      id: session.id,
      date: session.date && !isNaN(session.date.getTime())
        ? session.date.toISOString().split("T")[0]
        : "",
      committeeType: session.committeeType as SessionListItem["committeeType"],
      projectIds,
      projectTitles,
      status: session.status as SessionListItem["status"],
      attendees: session.attendees,
    }
  })
}

export async function GET(req: NextRequest) {
  const authError = verifyAuth(req)
  if (authError) return authError

  try {
    // Query all sessions with their associated project IDs
    const sessions = await prisma.pocSession.findMany({
      include: {
        sessionProjects: {
          select: { projectId: true },
        },
      },
      orderBy: { date: "desc" },
    })

    // Collect all unique project IDs across all sessions
    const allProjectIds = new Set<string>()
    for (const session of sessions) {
      for (const sp of session.sessionProjects) {
        allProjectIds.add(sp.projectId)
      }
    }

    // Fetch project short titles for all referenced projects
    const projects = await prisma.project.findMany({
      where: { id: { in: Array.from(allProjectIds) } },
      select: { id: true, shortTitle: true },
    })

    // Build a lookup map: projectId -> shortTitle
    const projectTitleMap: Record<string, string> = {}
    for (const project of projects) {
      projectTitleMap[project.id] = project.shortTitle
    }

    // Map to SessionListItem shape using the pure mapping function
    const sessionItems = mapSessionsToListItems(
      sessions as unknown as RawSessionWithProjects[],
      projectTitleMap
    )

    const response: SessionsListResponse = {
      sessions: sessionItems,
    }

    return NextResponse.json(response)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Failed to load sessions:", message)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
