"use client"

import { use, useState, useEffect, useMemo, useCallback, useRef } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { useData, useAuth } from "@/lib/store"
import { canPerformAction } from "@/lib/rules"
import { COMMITTEE_TYPE_LABELS, REVIEW_OUTCOMES } from "@/lib/constants"
import type {
  Project,
  ChecklistItem,
  ChecklistResponse,
  ReviewOutcome,
  ActionCategory,
  SessionStatus,
  POCSession,
  User,
  POCReview,
  Action,
  AuditEntry,
  RiskIssue,
} from "@/lib/types"
import { RAGBadge } from "@/components/rag-badge"
import { SessionPrintReport } from "@/components/sessions/session-print-report"
import { ClassificationBadge } from "@/components/classification-badge"
import { ChecklistTab } from "@/components/projects/checklist-tab"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ACTION_CATEGORIES } from "@/lib/constants"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  CalendarCheck,
  ChevronRight,
  ChevronLeft,
  Shield,
  Play,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ExternalLink,
  Users,
  X,
  UserPlus,
  Printer,
  Loader2,
  Lock,
} from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { RefreshCw } from "lucide-react"
import { useChecklistPersistence } from "@/hooks/use-checklist-persistence"

let _reviewCounter = 100
let _actionCounter = 500

export default function SessionWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const {
    sessions,
    projects,
    checklistTemplate,
    getReviewsForProject,
    getActionsForProject,
    getRisksForProject,
    addReview,
    addAction,
    addAuditEntry,
    updateSession,
  } = useData()
  const { currentUser, users: allUsers } = useAuth()

  const session = sessions.find((s) => s.id === id)
  if (!session) return notFound()

  const sessionProjects = projects.filter((p) => session.projectIds.includes(p.id))
  const [currentIndex, setCurrentIndex] = useState(0)
  const currentProject = sessionProjects[currentIndex]

  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = useCallback(() => {
    const printContent = printRef.current
    if (!printContent) return

    const printWindow = window.open("", "_blank", "width=900,height=700")
    if (!printWindow) return

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${COMMITTEE_TYPE_LABELS[session.committeeType]} Session Report - ${session.date}</title>
  <style>
    @page { size: A4; margin: 15mm 12mm; }
    body { margin: 0; padding: 0; }
  </style>
</head>
<body>${printContent.innerHTML}</body>
</html>`)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 400)
  }, [session])

  const canDecide = canPerformAction(currentUser, "RECORD_DECISION")
  const canChecklist = canPerformAction(currentUser, "COMPLETE_CHECKLIST")
  const isCompleted = session.status === "COMPLETED"
  const canEdit = canDecide && !isCompleted

  const sessionAttendees = session.attendees ?? []

  const addAttendee = useCallback(
    (name: string) => {
      if (!sessionAttendees.includes(name)) {
        updateSession(id, { attendees: [...sessionAttendees, name] })
      }
    },
    [id, sessionAttendees, updateSession]
  )

  const removeAttendee = useCallback(
    (name: string) => {
      updateSession(id, { attendees: sessionAttendees.filter((a) => a !== name) })
    },
    [id, sessionAttendees, updateSession]
  )

  const handleStartSession = () => {
    updateSession(id, { status: "IN_PROGRESS" })
    addAuditEntry({
      projectId: currentProject?.id ?? "",
      actor: currentUser.name,
      type: "POC_DECISION",
      description: `POC Session started: ${COMMITTEE_TYPE_LABELS[session.committeeType]} session.`,
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Session Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <CalendarCheck className="size-5 text-muted-foreground" />
              {COMMITTEE_TYPE_LABELS[session.committeeType]} Session
            </h1>
            <p className="text-sm text-muted-foreground">
              {new Date(session.date).toLocaleDateString("en-ZA", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
              <Printer className="size-3.5" />
              Print / PDF
            </Button>
            {session.status === "DRAFT" && canDecide && (
              <Button size="sm" className="gap-1.5" onClick={handleStartSession}>
                <Play className="size-3.5" />
                Start Session
              </Button>
            )}
            <SessionStatusBadge status={session.status} />
          </div>
        </div>

        {/* Attendees */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground shrink-0">
            <Users className="size-3.5" />
            Attendees
          </span>
          {sessionAttendees.length === 0 && (
            <span className="text-xs text-muted-foreground/60 italic">None added yet</span>
          )}
          {sessionAttendees.map((name) => (
            <Badge key={name} variant="secondary" className="text-xs gap-1 pr-1">
              {name}
              {canEdit && (
                <button
                  onClick={() => removeAttendee(name)}
                  className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                  aria-label={`Remove ${name}`}
                >
                  <X className="size-3" />
                </button>
              )}
            </Badge>
          ))}
          {canEdit && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-6 px-2 gap-1 text-xs">
                  <UserPlus className="size-3" />
                  Add
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground px-2 py-1">Select attendee</p>
                  {allUsers
                    .filter((u) => !sessionAttendees.includes(u.name))
                    .map((u) => (
                      <button
                        key={u.id}
                        onClick={() => addAttendee(u.name)}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent text-left w-full"
                      >
                        <div className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                          {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">{u.name}</span>
                          <span className="text-[10px] text-muted-foreground">{u.role}</span>
                        </div>
                      </button>
                    ))}
                  {allUsers.filter((u) => !sessionAttendees.includes(u.name)).length === 0 && (
                    <p className="text-xs text-muted-foreground px-2 py-1">All users added</p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Agenda Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {sessionProjects.map((p, i) => (
            <Button
              key={p.id}
              variant={i === currentIndex ? "default" : "outline"}
              size="sm"
              className="gap-1.5 shrink-0 text-xs"
              onClick={() => setCurrentIndex(i)}
            >
              <span className="font-mono text-[10px] opacity-70">{i + 1}</span>
              {p.shortTitle}
              <RAGBadge status={p.rag.overall} variant="dot" showLabel={false} />
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Project Review Workspace */}
      {currentProject && (
        <ProjectReviewWorkspace
          key={currentProject.id}
          project={currentProject}
          sessionId={id}
          session={session}
          sessionAttendees={sessionAttendees}
          canDecide={canDecide}
          canChecklist={canChecklist}
          isCompleted={isCompleted}
          onAddReview={addReview}
          onAddAction={addAction}
          onAddAuditEntry={addAuditEntry}
          currentUser={currentUser}
          getReviewsForProject={getReviewsForProject}
          getActionsForProject={getActionsForProject}
          getRisksForProject={getRisksForProject}
        />
      )}

      {/* Nav Footer */}
      <div className="flex items-center justify-between border-t pt-4">
        <Button
          variant="outline"
          size="sm"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((i) => i - 1)}
          className="gap-1.5"
        >
          <ChevronLeft className="size-3.5" />
          Previous
        </Button>
        <span className="text-xs text-muted-foreground">
          Project {currentIndex + 1} of {sessionProjects.length}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={currentIndex === sessionProjects.length - 1}
          onClick={() => setCurrentIndex((i) => i + 1)}
          className="gap-1.5"
        >
          Next
          <ChevronRight className="size-3.5" />
        </Button>
      </div>

      {/* Hidden print report -- rendered offscreen for print/PDF */}
      <div className="hidden">
        <SessionPrintReport
          ref={printRef}
          sessionId={id}
          sessionDate={session.date}
          committeeType={session.committeeType}
          status={session.status}
          attendees={sessionAttendees}
          projects={sessionProjects}
          getReviewsForProject={getReviewsForProject}
          getActionsForProject={getActionsForProject}
          getRisksForProject={getRisksForProject}
        />
      </div>
    </div>
  )
}

function SessionStatusBadge({ status }: { status: SessionStatus }) {
  const config: Record<SessionStatus, { label: string; className: string }> = {
    DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground border-border" },
    IN_PROGRESS: { label: "In Progress", className: "bg-rag-amber/10 text-rag-amber border-rag-amber/30" },
    COMPLETED: { label: "Completed", className: "bg-rag-green/10 text-rag-green border-rag-green/30" },
  }
  const c = config[status]
  return (
    <Badge variant="outline" className={c.className}>{c.label}</Badge>
  )
}

// ── Per-project review workspace within the session ──────────

function ProjectReviewWorkspace({
  project,
  sessionId,
  session,
  sessionAttendees,
  canDecide,
  canChecklist,
  isCompleted,
  onAddReview,
  onAddAction,
  onAddAuditEntry,
  currentUser,
  getReviewsForProject,
  getActionsForProject,
  getRisksForProject,
}: {
  project: Project
  sessionId: string
  session: POCSession
  sessionAttendees: string[]
  canDecide: boolean
  canChecklist: boolean
  isCompleted: boolean
  onAddReview: (review: POCReview) => void
  onAddAction: (action: Action) => void
  onAddAuditEntry: (entry: Omit<AuditEntry, "id" | "timestamp">) => void
  currentUser: User
  getReviewsForProject: (id: string) => POCReview[]
  getActionsForProject: (id: string) => Action[]
  getRisksForProject: (id: string) => RiskIssue[]
}) {
  const { checklistTemplate } = useData()
  const reviews = getReviewsForProject(project.id)
  const actions = getActionsForProject(project.id)
  const risks = getRisksForProject(project.id)

  // Persistence hook for auto-saving checklist state
  const { initialState, save, isSaving, error, conflict, reload } = useChecklistPersistence({
    sessionId,
    projectId: project.id,
    enabled: canChecklist && !isCompleted,
  })

  // Local checklist state for immediate UI response, hydrated from persistence
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])

  // Hydrate local state from persisted initial state when it becomes available
  useEffect(() => {
    if (initialState !== null) {
      setChecklist(initialState)
    }
  }, [initialState])

  // Handler that updates local state and persists
  const handleChecklistUpdate = useCallback(
    (updatedItems: ChecklistItem[]) => {
      setChecklist(updatedItems)
      save(updatedItems)
    },
    [save]
  )

  const [findings, setFindings] = useState("")
  const [outcome, setOutcome] = useState<ReviewOutcome | "">("")
  const [escalation, setEscalation] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [checklistReopened, setChecklistReopened] = useState(false)

  const canEditCompleted = canPerformAction(currentUser, "EDIT_COMPLETED_CHECKLIST")
  const checklistLocked = (isCompleted || submitted) && !checklistReopened

  const checklistSummary = useMemo(
    () =>
      checklist.reduce(
        (acc, item) => {
          if (item.response === "YES") acc.yes++
          else if (item.response === "NO") acc.no++
          else if (item.response === "PARTIAL") acc.partial++
          else acc.unanswered++
          return acc
        },
        { yes: 0, no: 0, partial: 0, unanswered: 0 }
      ),
    [checklist]
  )

  const openRisks = risks.filter((r) => r.status !== "CLOSED")

  const handleSubmitReview = () => {
    if (!outcome) return
    const reviewId = `r${++_reviewCounter}`
    // Use session attendees; ensure the submitting user is included
    const attendeesList = sessionAttendees.length > 0
      ? (sessionAttendees.includes(currentUser.name) ? sessionAttendees : [...sessionAttendees, currentUser.name])
      : [currentUser.name]

    onAddReview({
      id: reviewId,
      projectId: project.id,
      reviewDate: new Date().toISOString().split("T")[0],
      committeeType: session.committeeType,
      attendees: attendeesList,
      checklistResponses: checklist,
      findingsSummary: findings,
      escalation,
      outcome: outcome as ReviewOutcome,
    })

    onAddAuditEntry({
      projectId: project.id,
      actor: currentUser.name,
      type: "POC_DECISION",
      description: `POC Review: ${REVIEW_OUTCOMES.find((o) => o.value === outcome)?.label ?? outcome}. ${findings.slice(0, 80)}...`,
    })

    setSubmitted(true)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {/* Left: Checklist Panel */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Shield className="size-4 text-muted-foreground" />
            Oversight Checklist
            {isSaving && (
              <span className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Saving...
              </span>
            )}
            {error && error.includes("Session is completed and locked") && (
              <Badge variant="outline" className="text-[10px] gap-1 bg-muted/50 text-muted-foreground border-border">
                <Lock className="size-3" />
                Session completed
              </Badge>
            )}
          </h2>
          <Button variant="ghost" size="sm" asChild className="text-xs gap-1">
            <Link href={`/projects/${project.id}`}>
              View Full Project
              <ExternalLink className="size-3" />
            </Link>
          </Button>
        </div>

        {/* Conflict resolution banner */}
        {conflict && (
          <Alert variant="destructive" className="border-rag-amber/30 bg-rag-amber/10 text-rag-amber">
            <AlertTriangle className="size-4" />
            <AlertTitle>Conflict detected</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-2">
              <span>Another user updated this checklist. Click Reload to see the latest version.</span>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5 text-xs"
                onClick={() => reload()}
              >
                <RefreshCw className="size-3.5" />
                Reload
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {initialState === null ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        ) : (
          <>
            <ChecklistTab
              checklist={checklist}
              projectTitle={project.shortTitle}
              readOnly={!canChecklist || checklistLocked}
              onUpdate={handleChecklistUpdate}
            />

            {/* Reopen for editing when completed/submitted */}
            {(isCompleted || submitted) && canEditCompleted && !checklistReopened && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs w-fit"
                onClick={() => setChecklistReopened(true)}
              >
                <Shield className="size-3.5" />
                Reopen Checklist for Editing
              </Button>
            )}
            {checklistReopened && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-rag-amber/10 text-rag-amber border-rag-amber/30 text-[10px]">
                  Checklist reopened for editing
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6"
                  onClick={() => setChecklistReopened(false)}
                >
                  Lock
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Right: Decision & Action Panel */}
      <div className="flex flex-col gap-4">
        {/* Project Context Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ClassificationBadge classification={project.classification} />
              <span>{project.shortTitle}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Health</span>
              <RAGBadge status={project.rag.overall} />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {project.healthNarrative}
            </p>
            <Separator />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{openRisks.length} open risk(s)</span>
              <span>{actions.filter((a) => a.status !== "CLOSED").length} open action(s)</span>
            </div>
          </CardContent>
        </Card>

        {/* Checklist Progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Checklist Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 text-xs mb-3">
              <span><span className="font-semibold text-rag-green">{checklistSummary.yes}</span> Yes</span>
              <span><span className="font-semibold text-rag-amber">{checklistSummary.partial}</span> Partial</span>
              <span><span className="font-semibold text-rag-red">{checklistSummary.no}</span> No</span>
              <span><span className="font-semibold text-muted-foreground">{checklistSummary.unanswered}</span> Pending</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden flex">
              {checklistSummary.yes > 0 && (
                <div
                  className="bg-rag-green h-full transition-all"
                  style={{ width: `${(checklistSummary.yes / checklist.length) * 100}%` }}
                />
              )}
              {checklistSummary.partial > 0 && (
                <div
                  className="bg-rag-amber h-full transition-all"
                  style={{ width: `${(checklistSummary.partial / checklist.length) * 100}%` }}
                />
              )}
              {checklistSummary.no > 0 && (
                <div
                  className="bg-rag-red h-full transition-all"
                  style={{ width: `${(checklistSummary.no / checklist.length) * 100}%` }}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Decision Panel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Decision
              {submitted && <CheckCircle2 className="size-4 text-rag-green" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {submitted ? (
              <div className="flex flex-col gap-2">
                <Badge variant="outline" className="bg-rag-green/10 text-rag-green border-rag-green/30 w-fit">
                  <CheckCircle2 className="size-3 mr-1" />
                  Review Submitted
                </Badge>
                <p className="text-xs text-muted-foreground">
                  Decision: {REVIEW_OUTCOMES.find((o) => o.value === outcome)?.label}
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <Label className="text-xs">Findings Summary</Label>
                  <Textarea
                    value={findings}
                    onChange={(e) => setFindings(e.target.value)}
                    placeholder="Summarise key findings from the review..."
                    className="min-h-[80px] text-xs resize-none"
                    disabled={!canDecide || isCompleted}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-xs">Review Outcome</Label>
                  <Select
                    value={outcome}
                    onValueChange={(v) => setOutcome(v as ReviewOutcome)}
                    disabled={!canDecide || isCompleted}
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="Select outcome..." />
                    </SelectTrigger>
                    <SelectContent>
                      {REVIEW_OUTCOMES.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`escalation-${project.id}`}
                    checked={escalation}
                    onChange={(e) => setEscalation(e.target.checked)}
                    disabled={!canDecide || isCompleted}
                    className="rounded border-input"
                  />
                  <Label htmlFor={`escalation-${project.id}`} className="text-xs flex items-center gap-1">
                    <AlertTriangle className="size-3 text-rag-amber" />
                    Flag for escalation
                  </Label>
                </div>
                <Button
                  size="sm"
                  disabled={!canDecide || !outcome || !findings.trim() || isCompleted}
                  onClick={handleSubmitReview}
                  className="gap-1.5"
                >
                  <CheckCircle2 className="size-3.5" />
                  Submit Decision
                </Button>
                {!canDecide && (
                  <p className="text-[10px] text-muted-foreground">
                    Only POC Chair or Admin can record decisions.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Quick Action Creation */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
                  <Plus className="size-3" />
                  Create Action from Review
                </Button>
              </DialogTrigger>
              <DialogContent>
                <SessionActionDialog
                  projectId={project.id}
                  onSubmit={(action) => {
                    onAddAction(action)
                    onAddAuditEntry({
                      projectId: project.id,
                      actor: currentUser.name,
                      type: "ACTION_CHANGE",
                      description: `Action created during POC session: "${action.description.slice(0, 60)}..."`,
                    })
                    setActionDialogOpen(false)
                  }}
                />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SessionActionDialog({
  projectId,
  onSubmit,
}: {
  projectId: string
  onSubmit: (action: any) => void
}) {
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<ActionCategory>("GOVERNANCE")
  const [owner, setOwner] = useState("")
  const [dueDate, setDueDate] = useState("")

  const valid = description.trim() && owner.trim() && dueDate

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create Action from Review</DialogTitle>
        <DialogDescription>
          Record an action item arising from the POC review discussion.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="session-action-desc">Description</Label>
          <Textarea
            id="session-action-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the action required..."
            className="min-h-[80px]"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="session-action-cat">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ActionCategory)}>
              <SelectTrigger id="session-action-cat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTION_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="session-action-due">Due Date</Label>
            <Input
              id="session-action-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="session-action-owner">Owner</Label>
          <Input
            id="session-action-owner"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            placeholder="Name of responsible person"
          />
        </div>
      </div>
      <DialogFooter>
        <Button
          disabled={!valid}
          onClick={() =>
            onSubmit({
              id: `a${++_actionCounter}`,
              projectId,
              description,
              owner,
              dueDate,
              status: "OPEN",
              category,
              evidenceLinks: [],
            })
          }
        >
          Create Action
        </Button>
      </DialogFooter>
    </>
  )
}
