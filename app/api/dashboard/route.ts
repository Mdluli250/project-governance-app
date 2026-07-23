import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyAuth } from "@/lib/auth-middleware"
import { aggregateClassificationCounts } from "@/lib/dashboard-aggregation"
import type { DashboardSummaryResponse } from "@/lib/api-types"

export async function GET(req: NextRequest) {
  const authError = verifyAuth(req)
  if (authError) return authError

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [projects, overdueActions, upcomingReviews] = await Promise.all([
      // Fetch all projects for classification counts and RAG distribution
      prisma.project.findMany({
        select: {
          id: true,
          shortTitle: true,
          classification: true,
          ragOverall: true,
        },
      }),

      // Count overdue actions: dueDate < today AND status !== 'CLOSED'
      prisma.action.count({
        where: {
          dueDate: { lt: today },
          status: { not: "CLOSED" },
        },
      }),

      // Fetch upcoming reviews: next review dates per project (future reviews, limited to 5)
      prisma.pocReview.findMany({
        where: {
          reviewDate: { gte: today },
        },
        select: {
          projectId: true,
          reviewDate: true,
          project: {
            select: { shortTitle: true },
          },
        },
        orderBy: { reviewDate: "asc" },
        take: 5,
      }),
    ])

    // Compute classification counts
    const classificationCounts = aggregateClassificationCounts(
      projects as Array<{ classification: "A" | "B" | "C" }>
    )

    // Compute RAG distribution from ragOverall
    const ragDistribution = { overall: { RED: 0, AMBER: 0, GREEN: 0 } }
    for (const project of projects) {
      const rag = project.ragOverall as "RED" | "AMBER" | "GREEN"
      if (rag in ragDistribution.overall) {
        ragDistribution.overall[rag]++
      }
    }

    // Map upcoming reviews
    const mappedUpcomingReviews = upcomingReviews.map((review) => ({
      projectId: review.projectId,
      projectShortTitle: review.project.shortTitle,
      reviewDate: review.reviewDate.toISOString().split("T")[0],
    }))

    const response: DashboardSummaryResponse = {
      classificationCounts,
      ragDistribution,
      overdueActionCount: overdueActions,
      upcomingReviews: mappedUpcomingReviews,
      totalProjects: projects.length,
    }

    return NextResponse.json(response)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Failed to load dashboard summary:", message)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
