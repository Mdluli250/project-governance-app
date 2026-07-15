"use client"

import { useState } from "react"
import Link from "next/link"
import { useData, useAuth } from "@/lib/store"
import { canPerformAction } from "@/lib/rules"
import { COMMITTEE_TYPE_LABELS } from "@/lib/constants"
import type { CommitteeType, SessionStatus } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CalendarCheck,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  FileEdit,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { DeleteSessionDialog } from "@/components/sessions/delete-session-dialog"

const statusConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  DRAFT: {
    label: "Draft",
    icon: FileEdit,
    className: "bg-muted text-muted-foreground border-border",
  },
  IN_PROGRESS: {
    label: "In Progress",
    icon: Clock,
    className: "bg-rag-amber/10 text-rag-amber border-rag-amber/30",
  },
  COMPLETED: {
    label: "Completed",
    icon: CheckCircle2,
    className: "bg-rag-green/10 text-rag-green border-rag-green/30",
  },
}

let _sessionCounter = 100

export default function SessionsPage() {
  const { sessions, projects, addSession } = useData()
  const { currentUser } = useAuth()
  const canCreate = canPerformAction(currentUser, "CREATE_SESSION")
  const canDelete = canPerformAction(currentUser, "DELETE_SESSION")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<typeof sessions[number] | null>(null)
  const [newCommitteeType, setNewCommitteeType] = useState<CommitteeType>("DIVISIONAL")
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0])
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])

  const sorted = [...sessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  function handleCreateSession() {
    if (selectedProjectIds.length === 0) {
      toast.error("Select at least one project for the session agenda.")
      return
    }

    const newSession = {
      id: `ses-${++_sessionCounter}`,
      date: newDate,
      committeeType: newCommitteeType,
      projectIds: selectedProjectIds,
      status: "DRAFT" as SessionStatus,
      attendees: [] as string[],
    }

    addSession(newSession)
    toast.success("POC session created successfully.")
    setDialogOpen(false)
    setSelectedProjectIds([])
    setNewCommitteeType("DIVISIONAL")
    setNewDate(new Date().toISOString().split("T")[0])
  }

  function toggleProject(projectId: string) {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-balance">
            POC Sessions
          </h1>
          <p className="text-sm text-muted-foreground">
            Project Oversight Committee sessions and review meetings.
          </p>
        </div>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="size-4" />
                New Session
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New POC Session</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="session-committee">Committee Type</Label>
                  <Select
                    value={newCommitteeType}
                    onValueChange={(v) => setNewCommitteeType(v as CommitteeType)}
                  >
                    <SelectTrigger id="session-committee">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(COMMITTEE_TYPE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="session-date">Session Date</Label>
                  <Input
                    id="session-date"
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Agenda Projects</Label>
                  <p className="text-xs text-muted-foreground">
                    Select at least one project for the session agenda.
                  </p>
                  <div className="max-h-48 overflow-y-auto rounded-md border border-border p-2 flex flex-col gap-1">
                    {projects.map((p) => (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedProjectIds.includes(p.id)}
                          onCheckedChange={() => toggleProject(p.id)}
                        />
                        <span className="font-medium">{p.shortTitle}</span>
                        <Badge variant="outline" className="ml-auto text-[10px] px-1.5">
                          Class {p.classification}
                        </Badge>
                      </label>
                    ))}
                  </div>
                  {selectedProjectIds.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedProjectIds.length} project(s) selected
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleCreateSession}>Create Session</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarCheck className="size-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No POC sessions scheduled.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sorted.map((session) => {
            const config = statusConfig[session.status]
            const Icon = config.icon
            const sessionProjects = projects.filter((p) =>
              session.projectIds.includes(p.id)
            )

            return (
              <Card key={session.id} className="hover:border-primary/30 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <CalendarCheck className="size-4 text-muted-foreground" />
                      {COMMITTEE_TYPE_LABELS[session.committeeType]} Session
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={config.className}>
                        <Icon className="size-3 mr-1" />
                        {config.label}
                      </Badge>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          aria-label={`Delete ${COMMITTEE_TYPE_LABELS[session.committeeType]} session on ${new Date(session.date).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}`}
                          onClick={() => {
                            setSessionToDelete(session)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      {new Date(session.date).toLocaleDateString("en-ZA", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                    <span>{sessionProjects.length} project(s) on agenda</span>
                    <span>{(session.attendees ?? []).length} attendee(s)</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {sessionProjects.map((p) => (
                      <Badge key={p.id} variant="secondary" className="text-xs">
                        {p.shortTitle}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs" asChild>
                      <Link href={`/sessions/${session.id}`}>
                        {session.status === "COMPLETED"
                          ? "View Session"
                          : "Open Workspace"}
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {sessionToDelete && (
        <DeleteSessionDialog
          session={sessionToDelete}
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            setDeleteDialogOpen(open)
            if (!open) setSessionToDelete(null)
          }}
        />
      )}
    </div>
  )
}
