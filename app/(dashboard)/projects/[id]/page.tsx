"use client"

import { use } from "react"
import { notFound } from "next/navigation"
import { useData, useAuth } from "@/lib/store"
import { canPerformAction, getNextPOCReviewDue, getActionCounts } from "@/lib/rules"
import type { ChecklistItem } from "@/lib/types"
import { RAGBadge } from "@/components/rag-badge"
import { ClassificationBadge } from "@/components/classification-badge"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OverviewTab } from "@/components/projects/overview-tab"
import { HealthTab } from "@/components/projects/health-tab"
import { ReviewsTab } from "@/components/projects/reviews-tab"
import { ChecklistTab } from "@/components/projects/checklist-tab"
import { RisksTab } from "@/components/projects/risks-tab"
import { ActionsTab } from "@/components/projects/actions-tab"

import {
  LayoutList,
  Activity,
  ClipboardCheck,
  ClipboardList,
  AlertTriangle,
  Shield,
  Calendar,
  AlertCircle,
} from "lucide-react"

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const {
    getProjectById,
    getReviewsForProject,
    getActionsForProject,
    getRisksForProject,
    updateProject,
    updateReview,
    addAuditEntry,
    reviews: allReviews,
  } = useData()
  const { currentUser } = useAuth()

  const project = getProjectById(id)
  if (!project) return notFound()

  const reviews = getReviewsForProject(id)
  const actions = getActionsForProject(id)

  const risks = getRisksForProject(id)

  const lastReviewDate = reviews.length > 0 ? reviews[0].reviewDate : undefined
  const nextPOCDue = getNextPOCReviewDue(project, lastReviewDate)
  const actionCounts = getActionCounts(id, actions)

  // Latest review checklist for the checklist tab
  const latestReview = reviews.length > 0 ? reviews[0] : null
  const latestChecklist = latestReview ? latestReview.checklistResponses : []
  const canEditCompleted = canPerformAction(currentUser, "EDIT_COMPLETED_CHECKLIST")

  const handleChecklistUpdate = (items: ChecklistItem[]) => {
    if (latestReview && canEditCompleted) {
      updateReview(latestReview.id, { checklistResponses: items })
      addAuditEntry({
        projectId: id,
        actor: currentUser.name,
        type: "REVIEW_CREATED",
        description: "Review checklist edited by " + currentUser.role + ".",
      })
    }
  }

  const handleNarrativeChange = (narrative: string) => {
    if (canPerformAction(currentUser, "EDIT_PROJECT")) {
      updateProject(id, { healthNarrative: narrative })
      addAuditEntry({
        projectId: id,
        actor: currentUser.name,
        type: "HEALTH_UPDATE",
        description: "Health narrative updated.",
      })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <ClassificationBadge classification={project.classification} />
          <RAGBadge status={project.rag.overall} variant="large" />
          {actionCounts.overdue > 0 && (
            <Badge variant="outline" className="bg-rag-red/10 text-rag-red border-rag-red/30 text-xs gap-1">
              <AlertCircle className="size-3" />
              {actionCounts.overdue} overdue
            </Badge>
          )}
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-balance">
            {project.shortTitle}
          </h1>
          <p className="text-sm text-muted-foreground text-pretty">
            {project.longTitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            Next POC due: {new Date(nextPOCDue).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
          </span>
          <span className="flex items-center gap-1.5">
            <ClipboardList className="size-3.5" />
            {actionCounts.open} open actions
          </span>
          <span>
            {project.cluster} / {project.impactArea}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="gap-1.5 text-xs">
            <LayoutList className="size-3.5" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="health" className="gap-1.5 text-xs">
            <Activity className="size-3.5" />
            <span className="hidden sm:inline">Health</span>
          </TabsTrigger>
          <TabsTrigger value="reviews" className="gap-1.5 text-xs">
            <Shield className="size-3.5" />
            <span className="hidden sm:inline">Reviews</span>
            {reviews.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{reviews.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="checklist" className="gap-1.5 text-xs">
            <ClipboardCheck className="size-3.5" />
            <span className="hidden sm:inline">Checklist</span>
          </TabsTrigger>
          <TabsTrigger value="risks" className="gap-1.5 text-xs">
            <AlertTriangle className="size-3.5" />
            <span className="hidden sm:inline">Risks</span>
            {risks.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{risks.filter(r => r.status !== "CLOSED").length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="actions" className="gap-1.5 text-xs">
            <ClipboardList className="size-3.5" />
            <span className="hidden sm:inline">Actions</span>
            {actionCounts.open > 0 && (
              <Badge variant="secondary" className={`ml-1 h-4 px-1 text-[10px] ${actionCounts.overdue > 0 ? "bg-rag-red/15 text-rag-red" : ""}`}>
                {actionCounts.open}
              </Badge>
            )}
          </TabsTrigger>


        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab project={project} />
        </TabsContent>
        <TabsContent value="health" className="mt-4">
          <HealthTab project={project} onNarrativeChange={handleNarrativeChange} />
        </TabsContent>
        <TabsContent value="reviews" className="mt-4">
          <ReviewsTab reviews={reviews} />
        </TabsContent>
        <TabsContent value="checklist" className="mt-4">
          <ChecklistTab
            checklist={latestChecklist}
            projectTitle={project.shortTitle}
            readOnly={!canEditCompleted}
            onUpdate={canEditCompleted ? handleChecklistUpdate : undefined}
          />
        </TabsContent>
        <TabsContent value="risks" className="mt-4">
          <RisksTab risks={risks} projectId={id} />
        </TabsContent>
        <TabsContent value="actions" className="mt-4">
          <ActionsTab projectId={id} actions={actions} />
        </TabsContent>


      </Tabs>
    </div>
  )
}
