"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import type { Project, Action, POCReview } from "@/lib/types"
import type { PortfolioProject } from "@/lib/api-types"
import { getNextPOCReviewDue, getActionCounts, canPerformAction } from "@/lib/rules"
import { useAuth } from "@/lib/store"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { RAGBadge } from "@/components/rag-badge"
import { ClassificationBadge } from "@/components/classification-badge"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditProjectDialog } from "@/components/portfolio/edit-project-dialog"
import { DeleteProjectDialog } from "@/components/portfolio/delete-project-dialog"

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
  const { users: allUsers, currentUser } = useAuth()
  const canEdit = canPerformAction(currentUser, "EDIT_PROJECT")

  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)
  const [loadingEditProject, setLoadingEditProject] = useState(false)

  // Fetch full project detail before opening edit dialog to avoid data loss
  async function handleEditClick(p: Project | PortfolioProject) {
    // Check if this is a full Project (has fields like riskComplexity) or a slim PortfolioProject
    if ("riskComplexity" in p && "startDate" in p && "contractTerm" in p) {
      // Already a full Project object
      setEditingProject(p as Project)
      return
    }

    // Need to fetch the full project detail
    setLoadingEditProject(true)
    try {
      const { fetchProjectDetail } = await import("@/lib/data-db")
      const detail = await fetchProjectDetail(p.id)
      setEditingProject(detail.project)
    } catch {
      // If fetch fails, open with what we have — fields will be missing but the dialog will still open
      setEditingProject(p as unknown as Project)
    } finally {
      setLoadingEditProject(false)
    }
  }

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
    <>
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
            {canEdit && <TableHead className="w-[50px]"><span className="sr-only">Actions</span></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={canEdit ? 9 : 8} className="h-24 text-center text-muted-foreground">
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
                {canEdit && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="size-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditClick(p)}>
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeletingProject(p as Project)}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>

    {editingProject && (
      <EditProjectDialog
        project={editingProject}
        open={!!editingProject}
        onOpenChange={(open) => {
          if (!open) setEditingProject(null)
        }}
      />
    )}

    {deletingProject && (
      <DeleteProjectDialog
        project={deletingProject}
        open={!!deletingProject}
        onOpenChange={(open) => {
          if (!open) setDeletingProject(null)
        }}
      />
    )}
    </>
  )
}
