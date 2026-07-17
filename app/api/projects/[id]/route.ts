import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { mapProject, mapAction, mapReview, mapRisk, mapKda } from "@/lib/prisma-mappers"
import { verifyAuth } from "@/lib/auth-middleware"
import type { ProjectDetailResponse, ErrorResponse } from "@/lib/api-types"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = verifyAuth(request)
  if (authError) return authError

  const { id } = await params

  try {
    const project = await prisma.project.findUnique({
      where: { id },
    })

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" } satisfies ErrorResponse,
        { status: 404 }
      )
    }

    const [actions, reviews, risks, kdaDecisions] = await Promise.all([
      prisma.action.findMany({
        where: { projectId: id },
        orderBy: { createdAt: "asc" },
      }),
      prisma.pocReview.findMany({
        where: { projectId: id },
        include: { checklistResponses: true },
        orderBy: { reviewDate: "desc" },
      }),
      prisma.risk.findMany({
        where: { projectId: id },
        orderBy: { createdAt: "asc" },
      }),
      prisma.kdaDecision.findMany({
        where: { projectId: id },
        orderBy: { date: "desc" },
      }),
    ])

    const response: ProjectDetailResponse = {
      project: mapProject(project),
      actions: actions.map(mapAction),
      reviews: reviews.map(mapReview),
      risks: risks.map(mapRisk),
      kdaDecisions: kdaDecisions.map(mapKda),
    }

    return NextResponse.json(response)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Failed to load project detail:", message)
    return NextResponse.json(
      { error: "Internal server error" } satisfies ErrorResponse,
      { status: 500 }
    )
  }
}
