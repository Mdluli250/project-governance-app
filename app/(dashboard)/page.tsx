"use client"

import { useState, useMemo, useEffect } from "react"
import { useData } from "@/lib/store"
import { SummaryCards } from "@/components/dashboard/summary-cards"
import { RAGDistributionChart } from "@/components/dashboard/rag-distribution-chart"
import { AttentionPanel } from "@/components/dashboard/attention-panel"
import {
  PortfolioFilters,
  type FilterState,
} from "@/components/dashboard/portfolio-filters"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Summary cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="size-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Chart skeleton */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[220px] w-full rounded-md" />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[260px] w-full rounded-md" />
          </CardContent>
        </Card>
      </div>
      {/* Attention panel skeleton */}
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-36" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function DashboardPage() {
  const {
    projects,
    actions,
    reviews,
    dashboardSummary,
    loadDashboard,
    loadingStates,
    errors,
    retry,
  } = useData()

  const [filters, setFilters] = useState<FilterState>({
    classes: [],
    cluster: null,
    pm: null,
    objective: null,
  })

  // Load dashboard summary on mount
  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const isLoading = loadingStates["dashboard"]
  const error = errors["dashboard"]

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

  // Build summary card overrides from dashboardSummary when available and no filters are active
  const hasFilters =
    filters.classes.length > 0 ||
    filters.cluster !== null ||
    filters.pm !== null ||
    filters.objective !== null

  const summaryOverride = useMemo(() => {
    if (!dashboardSummary || hasFilters) return undefined
    return {
      total: dashboardSummary.totalProjects,
      classA: dashboardSummary.classificationCounts.A,
      classB: dashboardSummary.classificationCounts.B,
      classC: dashboardSummary.classificationCounts.C,
    }
  }, [dashboardSummary, hasFilters])

  // Build RAG distribution override from dashboardSummary when available and no filters active
  const ragOverride = useMemo(() => {
    if (!dashboardSummary || hasFilters) return undefined
    return dashboardSummary.ragDistribution.overall
  }, [dashboardSummary, hasFilters])

  // Error state with retry
  if (error && !dashboardSummary && projects.length === 0) {
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
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <AlertCircle className="size-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => retry("dashboard")}
          >
            <RefreshCw className="mr-2 size-3.5" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  // Loading state — show skeleton UI when no data is available yet
  if (isLoading && !dashboardSummary && projects.length === 0) {
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
        <DashboardSkeleton />
      </div>
    )
  }

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

      <SummaryCards projects={filteredProjects} summaryOverride={summaryOverride} />

      <RAGDistributionChart projects={filteredProjects} ragOverride={ragOverride} />

      <AttentionPanel
        projects={filteredProjects}
        actions={actions}
        reviews={reviewSummaries}
      />

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>Dashboard data may be outdated. {error}</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 text-xs"
            onClick={() => retry("dashboard")}
          >
            <RefreshCw className="mr-1 size-3" />
            Retry
          </Button>
        </div>
      )}
    </div>
  )
}
