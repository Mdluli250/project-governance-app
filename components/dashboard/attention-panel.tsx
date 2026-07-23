"use client"

import { useMemo } from "react"
import Link from "next/link"
import type { Project, Action } from "@/lib/types"
import { requiresAttention } from "@/lib/rules"
import { useData } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RAGBadge } from "@/components/rag-badge"
import { ClassificationBadge } from "@/components/classification-badge"
import { AlertTriangle, ArrowRight, CalendarClock, Clock } from "lucide-react"

interface AttentionPanelProps {
  projects: Project[]
  actions: Action[]
  reviews: { projectId: string; reviewDate: string }[]
}

export function AttentionPanel({ projects, actions, reviews }: AttentionPanelProps) {
  const { dashboardSummary } = useData()

  const attentionItems = useMemo(() => {
    return projects
      .map((project) => {
        const lastReview = reviews
          .filter((r) => r.projectId === project.id)
          .sort((a, b) => b.reviewDate.localeCompare(a.reviewDate))[0]
        const { needsAttention, reasons } = requiresAttention(
          project,
          actions,
          lastReview?.reviewDate
        )
        return { project, needsAttention, reasons }
      })
      .filter((item) => item.needsAttention)
      .sort((a, b) => {
        // Sort RED overall first, then by number of reasons
        if (a.project.rag.overall === "RED" && b.project.rag.overall !== "RED") return -1
        if (a.project.rag.overall !== "RED" && b.project.rag.overall === "RED") return 1
        return b.reasons.length - a.reasons.length
      })
  }, [projects, actions, reviews])

  // When full project data isn't available, use dashboardSummary as fallback
  const showSummaryFallback = projects.length === 0 && dashboardSummary !== null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <AlertTriangle className="size-4 text-rag-amber" />
          Requires Attention
          {!showSummaryFallback && ` (${attentionItems.length})`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {showSummaryFallback ? (
          <div className="flex flex-col gap-3">
            {dashboardSummary.overdueActionCount > 0 && (
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Clock className="size-4 text-destructive shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">
                    {dashboardSummary.overdueActionCount} overdue action{dashboardSummary.overdueActionCount !== 1 ? "s" : ""}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Actions past due date requiring follow-up
                  </span>
                </div>
              </div>
            )}
            {dashboardSummary.upcomingReviews.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarClock className="size-3.5" />
                  <span>Upcoming Reviews</span>
                </div>
                {dashboardSummary.upcomingReviews.slice(0, 5).map((review) => (
                  <Link
                    key={`${review.projectId}-${review.reviewDate}`}
                    href={`/projects/${review.projectId}`}
                    className="group flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-medium truncate">
                        {review.projectShortTitle}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Review due: {new Date(review.reviewDate).toLocaleDateString()}
                      </span>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 shrink-0" />
                  </Link>
                ))}
              </div>
            )}
            {dashboardSummary.overdueActionCount === 0 && dashboardSummary.upcomingReviews.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No projects require immediate attention.
              </p>
            )}
          </div>
        ) : attentionItems.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No projects require immediate attention.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {attentionItems.map(({ project, reasons }) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group flex items-start justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {project.shortTitle}
                    </span>
                    <ClassificationBadge classification={project.classification} />
                    <RAGBadge status={project.rag.overall} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {reasons.map((reason, i) => (
                      <span
                        key={i}
                        className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
                <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 shrink-0 mt-1" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
