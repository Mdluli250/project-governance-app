"use client"

import { useMemo } from "react"
import Link from "next/link"
import type { Project, Action } from "@/lib/types"
import { requiresAttention } from "@/lib/rules"
import { useData } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RAGBadge } from "@/components/rag-badge"
import { ClassificationBadge } from "@/components/classification-badge"
import { AlertTriangle, ArrowRight } from "lucide-react"

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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <AlertTriangle className="size-4 text-rag-amber" />
          Requires Attention ({attentionItems.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {attentionItems.length === 0 ? (
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
