"use client"

import { useState, useMemo } from "react"
import { useData } from "@/lib/store"
import { SummaryCards } from "@/components/dashboard/summary-cards"
import { RAGDistributionChart } from "@/components/dashboard/rag-distribution-chart"
import { AttentionPanel } from "@/components/dashboard/attention-panel"
import {
  PortfolioFilters,
  type FilterState,
} from "@/components/dashboard/portfolio-filters"

export default function DashboardPage() {
  const { projects, actions, reviews } = useData()
  const [filters, setFilters] = useState<FilterState>({
    classes: [],
    cluster: null,
    pm: null,
    objective: null,
  })

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (filters.classes.length > 0 && !filters.classes.includes(p.classification))
        return false
      if (filters.cluster && p.cluster !== filters.cluster) return false
      if (filters.pm && p.pmId !== filters.pm) return false
      if (
        filters.objective &&
        !p.strategicObjectives.includes(filters.objective)
      )
        return false
      return true
    })
  }, [projects, filters])

  const reviewSummaries = useMemo(
    () =>
      reviews.map((r) => ({
        projectId: r.projectId,
        reviewDate: r.reviewDate,
      })),
    [reviews]
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-balance">
          Executive Portfolio Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          SSoc Division governance overview across all active projects.
        </p>
      </div>

      <PortfolioFilters filters={filters} onFiltersChange={setFilters} />

      <SummaryCards projects={filteredProjects} />

      <RAGDistributionChart projects={filteredProjects} />

      <AttentionPanel
        projects={filteredProjects}
        actions={actions}
        reviews={reviewSummaries}
      />
    </div>
  )
}
