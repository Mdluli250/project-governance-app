import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyAuth } from "@/lib/auth-middleware"
import type { PortfolioResponse, PortfolioProject } from "@/lib/api-types"

// ── GET: Load portfolio projects with summaries ─────────────────────────────
export async function GET(req: NextRequest) {
  const authError = verifyAuth(req)
  if (authError) return authError

  try {
    // Fetch all projects with PM profile join
    const projects = await prisma.project.findMany({
      include: { pm: { select: { name: true, email: true } } },
      orderBy: { shortTitle: "asc" },
    })

    // Compute per-project action summaries (open count, overdue count)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [openActionCounts, overdueActionCounts] = await Promise.all([
      // Count open actions (status !== 'CLOSED') grouped by project
      prisma.action.groupBy({
        by: ["projectId"],
        where: { status: { not: "CLOSED" } },
        _count: { id: true },
      }),
      // Count overdue actions (dueDate < today AND status !== 'CLOSED') grouped by project
      prisma.action.groupBy({
        by: ["projectId"],
        where: {
          status: { not: "CLOSED" },
          dueDate: { lt: today },
        },
        _count: { id: true },
      }),
    ])

    // Compute per-project next review date (earliest future review date)
    const nextReviews = await prisma.pocReview.groupBy({
      by: ["projectId"],
      where: { reviewDate: { gte: today } },
      _min: { reviewDate: true },
    })

    // Build action summaries map
    const actionSummaries: Record<string, { open: number; overdue: number }> = {}
    for (const row of openActionCounts) {
      actionSummaries[row.projectId] = { open: row._count.id, overdue: 0 }
    }
    for (const row of overdueActionCounts) {
      if (!actionSummaries[row.projectId]) {
        actionSummaries[row.projectId] = { open: 0, overdue: row._count.id }
      } else {
        actionSummaries[row.projectId].overdue = row._count.id
      }
    }

    // Build review summaries map
    const reviewSummaries: Record<string, { nextReviewDate: string | null }> = {}
    for (const row of nextReviews) {
      reviewSummaries[row.projectId] = {
        nextReviewDate: row._min.reviewDate
          ? row._min.reviewDate.toISOString()
          : null,
      }
    }

    // Map projects to PortfolioProject shape (core fields only)
    const portfolioProjects: PortfolioProject[] = projects.map((p) => ({
      id: p.id,
      shortTitle: p.shortTitle,
      longTitle: p.longTitle,
      classification: p.classification as PortfolioProject["classification"],
      cluster: p.cluster,
      impactArea: p.impactArea,
      pmId: p.pmId,
      pm: { name: p.pm.name, email: p.pm.email },
      sponsorName: p.sponsorName,
      strategicObjectives: p.strategicObjectives,
      contractValue: p.contractValue?.toNumber() ?? 0,
      rag: {
        overall: (p.ragOverall ?? "GREEN") as PortfolioProject["rag"]["overall"],
        scope: (p.ragScope ?? "GREEN") as PortfolioProject["rag"]["scope"],
        schedule: (p.ragSchedule ?? "GREEN") as PortfolioProject["rag"]["schedule"],
        cost: (p.ragCost ?? "GREEN") as PortfolioProject["rag"]["cost"],
        quality: (p.ragQuality ?? "GREEN") as PortfolioProject["rag"]["quality"],
        risk: (p.ragRisk ?? "GREEN") as PortfolioProject["rag"]["risk"],
        sheq: (p.ragSheq ?? "GREEN") as PortfolioProject["rag"]["sheq"],
        data: (p.ragData ?? "GREEN") as PortfolioProject["rag"]["data"],
        compliance: (p.ragCompliance ?? "GREEN") as PortfolioProject["rag"]["compliance"],
      },
      lastUpdated: p.lastUpdated ? p.lastUpdated.toISOString() : "",
    }))

    const response: PortfolioResponse = {
      projects: portfolioProjects,
      actionSummaries,
      reviewSummaries,
    }

    return NextResponse.json(response)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Failed to load portfolio:", message)
    return NextResponse.json(
      { error: "Failed to load portfolio", details: [message] },
      { status: 500 }
    )
  }
}
