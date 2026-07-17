"use client"

import { useMemo } from "react"
import Link from "next/link"
import type { Project, Action, POCReview } from "@/lib/types"
import type { PortfolioProject } from "@/lib/api-types"
import { getNextPOCReviewDue, getActionCounts } from "@/lib/rules"
import { useAuth } from "@/lib/store"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { RAGBadge } from "@/components/rag-badge"
import { ClassificationBadge } from "@/components/classification-badge"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"

type SortKey = "shortTitle" | "classification" | "cluster" | "pm" | "overall" | "nextReview" | "openActions" | "overdueActions"
type SortDir = "asc" | "desc"

interface PortfolioTableProps {
  projects: (Project | PortfolioProject)[]
  actions: Action[]
  reviews: POCReview[]
  portfolioActionSummaries?: Record<string, { open: number; overdue: number }> | null
  portfolioReviewSummaries?: Record<string, { nextReviewDate: string | null }> | null
  sortKey: SortKey
  sortDir: SortDir
  onSort: (key: SortKey) => void
}

export function PortfolioTable({
  projects,
  actions,
  reviews,
  portfolioActionSummaries,
  portfolioReviewSummaries,
  sortKey,
  sortDir,
  onSort,
}: PortfolioTableProps) {
  const { users: allUsers } = useAuth()

  const enriched = useMemo(() => {
    return projects.map((p) => {
      // Use portfolioActionSummaries when available, otherwise compute from actions array
      let open: number
      let overdue: number
      if (portfolioActionSummaries && portfolioActionSummaries[p.id]) {
        open = portfolioActionSummaries[p.id].open
        overdue = portfolioActionSummaries[p.id].overdue
      } else {
        const counts = getActionCounts(p.id, actions)
        open = counts.open
        overdue = counts.overdue
      }

      // Use portfolioReviewSummaries when available, otherwise compute from reviews array
      let nextReview: string
      if (portfolioReviewSummaries && portfolioReviewSummaries[p.id]) {
        nextReview = portfolioReviewSummaries[p.id].nextReviewDate ?? ""
      } else {
        const lastReview = reviews
          .filter((r) => r.projectId === p.id)
          .sort((a, b) => b.reviewDate.localeCompare(a.reviewDate))[0]
        nextReview = getNextPOCReviewDue(p as Project, lastReview?.reviewDate)
      }

      // Use pm field from PortfolioProject if available, otherwise look up from users
      let pmName: string
      if ("pm" in p && p.pm) {
        pmName = p.pm.name
      } else {
        const pm = allUsers.find((u) => u.id === p.pmId)
        pmName = pm?.name ?? "Unknown"
      }

      return {
        ...p,
        nextReview,
        openActions: open,
        overdueActions: overdue,
        pmName,
      }
    })
  }, [projects, actions, reviews, allUsers, portfolioActionSummaries, portfolioReviewSummaries])

  const sorted = useMemo(() => {
    return [...enriched].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "shortTitle":
          cmp = a.shortTitle.localeCompare(b.shortTitle)
          break
        case "classification":
          cmp = a.classification.localeCompare(b.classification)
          break
        case "cluster":
          cmp = a.cluster.localeCompare(b.cluster)
          break
        case "pm":
          cmp = a.pmName.localeCompare(b.pmName)
          break
        case "overall": {
          const order = { RED: 0, AMBER: 1, GREEN: 2 }
          cmp = order[a.rag.overall] - order[b.rag.overall]
          break
        }
        case "nextReview":
          cmp = a.nextReview.localeCompare(b.nextReview)
          break
        case "openActions":
          cmp = a.openActions - b.openActions
          break
        case "overdueActions":
          cmp = a.overdueActions - b.overdueActions
          break
      }
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [enriched, sortKey, sortDir])

  const SortHeader = ({
    label,
    colKey,
  }: {
    label: string
    colKey: SortKey
  }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 text-xs font-medium"
      onClick={() => onSort(colKey)}
    >
      {label}
      <ArrowUpDown className="ml-1 size-3" />
    </Button>
  )

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><SortHeader label="Project" colKey="shortTitle" /></TableHead>
            <TableHead><SortHeader label="Class" colKey="classification" /></TableHead>
            <TableHead className="hidden md:table-cell"><SortHeader label="Cluster" colKey="cluster" /></TableHead>
            <TableHead className="hidden lg:table-cell"><SortHeader label="PM" colKey="pm" /></TableHead>
            <TableHead><SortHeader label="Overall RAG" colKey="overall" /></TableHead>
            <TableHead className="hidden md:table-cell"><SortHeader label="Next POC Due" colKey="nextReview" /></TableHead>
            <TableHead className="text-right"><SortHeader label="Open" colKey="openActions" /></TableHead>
            <TableHead className="text-right"><SortHeader label="Overdue" colKey="overdueActions" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                No projects match the current filters.
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((p) => (
              <TableRow key={p.id} className="group">
                <TableCell>
                  <Link
                    href={`/projects/${p.id}`}
                    className="font-medium text-sm hover:underline"
                  >
                    {p.shortTitle}
                  </Link>
                </TableCell>
                <TableCell>
                  <ClassificationBadge classification={p.classification} />
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {p.cluster}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {p.pmName}
                </TableCell>
                <TableCell>
                  <RAGBadge status={p.rag.overall} />
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {new Date(p.nextReview).toLocaleDateString("en-ZA", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary" className="text-xs">
                    {p.openActions}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {p.overdueActions > 0 ? (
                    <Badge
                      variant="outline"
                      className="text-xs bg-rag-red/10 text-rag-red border-rag-red/30"
                    >
                      {p.overdueActions}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      0
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
