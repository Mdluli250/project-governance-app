"use client"

import { useState } from "react"
import type { Action, ActionCategory, ActionStatus } from "@/lib/types"
import { ACTION_CATEGORIES } from "@/lib/constants"
import { isOverdue } from "@/lib/rules"
import { useAuth, useData } from "@/lib/store"
import { canPerformAction } from "@/lib/rules"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import { Label } from "@/components/ui/label"
import { Plus, ClipboardList, AlertCircle, Clock } from "lucide-react"

const statusStyles: Record<ActionStatus, string> = {
  OPEN: "bg-rag-red/10 text-rag-red border-rag-red/30",
  IN_PROGRESS: "bg-rag-amber/10 text-rag-amber border-rag-amber/30",
  CLOSED: "bg-rag-green/10 text-rag-green border-rag-green/30",
}

const statusLabels: Record<ActionStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  CLOSED: "Closed",
}

interface ActionsTabProps {
  projectId: string
  actions: Action[]
}

export function ActionsTab({ projectId, actions }: ActionsTabProps) {
  const { currentUser } = useAuth()
  const { addAction, updateAction, addAuditEntry } = useData()
  const canCreate = canPerformAction(currentUser, "CREATE_ACTION")
  const canEdit = canPerformAction(currentUser, "EDIT_PROJECT")
  const [dialogOpen, setDialogOpen] = useState(false)

  const sorted = [...actions].sort((a, b) => {
    if (a.status === "CLOSED" && b.status !== "CLOSED") return 1
    if (a.status !== "CLOSED" && b.status === "CLOSED") return -1
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  })

  const openCount = actions.filter((a) => a.status !== "CLOSED").length
  const overdueCount = actions.filter((a) => isOverdue(a)).length

  const handleStatusChange = (action: Action, newStatus: ActionStatus) => {
    updateAction(action.id, { status: newStatus })
    addAuditEntry({
      projectId,
      actor: currentUser.name,
      type: "ACTION_CHANGE",
      description: `Action "${action.description.slice(0, 50)}..." status changed to ${statusLabels[newStatus]}`,
      oldValue: action.status,
      newValue: newStatus,
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <ClipboardList className="size-3.5 text-muted-foreground" />
            <span className="font-semibold">{actions.length}</span> total
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5 text-rag-amber" />
            <span className="font-semibold">{openCount}</span> open
          </span>
          {overdueCount > 0 && (
            <span className="flex items-center gap-1.5">
              <AlertCircle className="size-3.5 text-rag-red" />
              <span className="font-semibold text-rag-red">{overdueCount}</span> overdue
            </span>
          )}
        </div>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 text-xs gap-1">
                <Plus className="size-3" />
                New Action
              </Button>
            </DialogTrigger>
            <NewActionDialog
              projectId={projectId}
              onSubmit={(action) => {
                addAction(action)
                addAuditEntry({
                  projectId,
                  actor: currentUser.name,
                  type: "ACTION_CHANGE",
                  description: `New action created: "${action.description.slice(0, 60)}..."`,
                })
                setDialogOpen(false)
              }}
            />
          </Dialog>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ClipboardList className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No actions recorded.</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[240px]">Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((action) => {
                const overdue = isOverdue(action)
                return (
                  <TableRow key={action.id} className={overdue ? "bg-rag-red/5" : ""}>
                    <TableCell>
                      <span className="text-sm">{action.description}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {ACTION_CATEGORIES.find((c) => c.value === action.category)?.label ?? action.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {action.owner}
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm whitespace-nowrap ${overdue ? "text-rag-red font-medium" : "text-muted-foreground"}`}>
                        {new Date(action.dueDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                        {overdue && <AlertCircle className="inline size-3 ml-1" />}
                      </span>
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Select
                          value={action.status}
                          onValueChange={(v) => handleStatusChange(action, v as ActionStatus)}
                        >
                          <SelectTrigger className="h-7 w-[120px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OPEN">Open</SelectItem>
                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                            <SelectItem value="CLOSED">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className={statusStyles[action.status]}>
                          {statusLabels[action.status]}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

let _actionCounter = 200

function NewActionDialog({
  projectId,
  onSubmit,
}: {
  projectId: string
  onSubmit: (action: Action) => void
}) {
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<ActionCategory>("GOVERNANCE")
  const [owner, setOwner] = useState("")
  const [dueDate, setDueDate] = useState("")

  const valid = description.trim() && owner.trim() && dueDate

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create New Action</DialogTitle>
        <DialogDescription>
          Assign an action item from a POC review or governance finding.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="action-desc">Description</Label>
          <Textarea
            id="action-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the action required..."
            className="min-h-[80px]"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="action-cat">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ActionCategory)}>
              <SelectTrigger id="action-cat">
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
            <Label htmlFor="action-due">Due Date</Label>
            <Input
              id="action-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="action-owner">Owner</Label>
          <Input
            id="action-owner"
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
    </DialogContent>
  )
}
