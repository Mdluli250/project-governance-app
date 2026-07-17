"use client"

import { useState, useMemo, useEffect } from "react"
import { useAuth, useData } from "@/lib/store"
import { canPerformAction } from "@/lib/rules"
import { PortfolioTable } from "@/components/portfolio/portfolio-table"
import { NewProjectDialog } from "@/components/portfolio/new-project-dialog"
import {
  PortfolioFilters,
  type FilterState,
} from "@/components/dashboard/portfolio-filters"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Plus } from "lucide-react"

type SortKey = "shortTitle" | "classification" | "cluster" | "pm" | "overall" | "nextReview" | "openActions" | "overdueActions"
type SortDir = "asc" | "desc"

export default function PortfolioPage() {
  const { currentUser } = useAuth()
  const {
    projects,
    actions,
    reviews,
    portfolioProjects,
    portfolioActionSummaries,
    portfolioReviewSummaries,
    loadPortfolio,
    loadingStates,
  } = useData()
  const [search, setSearch] = useState("")
  const [showNewProject, setShowNewProject] = useState(false)
  const canCreate = canPerformAction(currentUser, "EDIT_PROJECT")
  const [filters, setFilters] = useState<FilterState>({
    classes: [],
    cluster: null,
    pm: null,
    objective: null,
  })
  const [sortKey, setSortKey] = useState<SortKey>("shortTitle")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  // Load portfolio data on mount
  useEffect(() => {
    loadPortfolio()
  }, [loadPortfolio])

  const isLoading = loadingStates["portfolio"] ?? false

  // Use portfolioProjects when available, falling back to existing projects array
  const effectiveProjects = useMemo(() => {
    if (portfolioProjects) {
      // Map PortfolioProject[] to a shape compatible with the filter logic
      return portfolioProjects
    }
    return projects
  }, [portfolioProjects, projects])

  const filtered = useMemo(() => {
    return effectiveProjects.filter((p) => {
      if (search && !p.shortTitle.toLowerCase().includes(search.toLowerCase()) && !p.longTitle.toLowerCase().includes(search.toLowerCase()))
        return false
      if (filters.classes.length > 0 && !filters.classes.includes(p.classification))
        return false
      if (filters.cluster && p.cluster !== filters.cluster) return false
      if (filters.pm && p.pmId !== filters.pm) return false
      if (filters.objective && !p.strategicObjectives.includes(filters.objective))
        return false
      return true
    })
  }, [effectiveProjects, search, filters])

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-balance">
            Portfolio Register
          </h1>
          <p className="text-sm text-muted-foreground">
            All active projects with classification, RAG status, and action tracking.
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowNewProject(true)} size="sm" className="shrink-0 gap-1.5">
            <Plus className="size-4" />
            New Project
          </Button>
        )}
      </div>

      {canCreate && <NewProjectDialog open={showNewProject} onOpenChange={setShowNewProject} />}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 w-full sm:w-[280px]"
            />
          </div>
          <PortfolioFilters filters={filters} onFiltersChange={setFilters} />
        </div>

        {isLoading && !portfolioProjects ? (
          <div className="rounded-lg border p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[60px]" />
                <Skeleton className="h-4 w-[100px] hidden md:block" />
                <Skeleton className="h-4 w-[80px] hidden lg:block" />
                <Skeleton className="h-4 w-[60px]" />
                <Skeleton className="h-4 w-[80px] hidden md:block" />
                <Skeleton className="h-4 w-[40px]" />
                <Skeleton className="h-4 w-[40px]" />
              </div>
            ))}
          </div>
        ) : (
          <PortfolioTable
            projects={filtered}
            actions={actions}
            reviews={reviews}
            portfolioActionSummaries={portfolioActionSummaries}
            portfolioReviewSummaries={portfolioReviewSummaries}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
          />
        )}

        <p className="text-xs text-muted-foreground text-right">
          Showing {filtered.length} of {effectiveProjects.length} projects
        </p>
      </div>
    </div>
  )
}
