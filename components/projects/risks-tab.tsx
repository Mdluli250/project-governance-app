"use client"

import { useState } from "react"
import type { RiskIssue, RiskIssueType, Likelihood, Impact, RAGStatus } from "@/lib/types"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { RAGBadge } from "@/components/rag-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { AlertTriangle, ShieldAlert, Plus, Pencil } from "lucide-react"
import { useAuth, useData } from "@/lib/store"
import { canPerformAction } from "@/lib/rules"
import { toast } from "sonner"

interface RisksTabProps {
  risks: RiskIssue[]
  projectId: string
}

const typeIcons = {
  RISK: AlertTriangle,
  ISSUE: ShieldAlert,
}

const statusStyles: Record<string, string> = {
  OPEN: "bg-rag-red/10 text-rag-red border-rag-red/30",
  MITIGATED: "bg-rag-amber/10 text-rag-amber border-rag-amber/30",
  CLOSED: "bg-muted text-muted-foreground border-border",
}

interface RiskFormState {
  title: string
  type: RiskIssueType
  likelihood: Likelihood
  impact: Impact
  ragStatus: RAGStatus
  mitigation: string
  owner: string
  status: "OPEN" | "MITIGATED" | "CLOSED"
}

const emptyForm: RiskFormState = {
  title: "",
  type: "RISK",
  likelihood: "MEDIUM",
  impact: "MEDIUM",
  ragStatus: "AMBER",
  mitigation: "",
  owner: "",
  status: "OPEN",
}

let _riskCounter = 200

export function RisksTab({ risks, projectId }: RisksTabProps) {
  const { currentUser } = useAuth()
  const { addRisk, updateRisk, addAuditEntry } = useData()
  const canEdit = canPerformAction(currentUser, "EDIT_PROJECT")

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<RiskFormState>(emptyForm)

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
  }

  function handleAdd() {
    if (!form.title.trim()) {
      toast.error("Title is required.")
      return
    }
    const newRisk: RiskIssue = {
      id: `ri${++_riskCounter}`,
      projectId,
      title: form.title.trim(),
      type: form.type,
      likelihood: form.likelihood,
      impact: form.impact,
      ragStatus: form.ragStatus,
      mitigation: form.mitigation.trim(),
      owner: form.owner.trim(),
      status: form.status,
    }
    addRisk(newRisk)
    addAuditEntry({
      projectId,
      actor: currentUser.name,
      type: "PROJECT_UPDATE",
      description: `New ${form.type.toLowerCase()} added: "${form.title.trim()}"`,
    })
    toast.success(`${form.type === "RISK" ? "Risk" : "Issue"} added.`)
    resetForm()
    setAddOpen(false)
  }

  function openEdit(risk: RiskIssue) {
    setEditingId(risk.id)
    setForm({
      title: risk.title,
      type: risk.type,
      likelihood: risk.likelihood,
      impact: risk.impact,
      ragStatus: risk.ragStatus,
      mitigation: risk.mitigation,
      owner: risk.owner,
      status: risk.status,
    })
    setEditOpen(true)
  }

  function handleEdit() {
    if (!editingId || !form.title.trim()) {
      toast.error("Title is required.")
      return
    }
    updateRisk(editingId, {
      title: form.title.trim(),
      type: form.type,
      likelihood: form.likelihood,
      impact: form.impact,
      ragStatus: form.ragStatus,
      mitigation: form.mitigation.trim(),
      owner: form.owner.trim(),
      status: form.status,
    })
    addAuditEntry({
      projectId,
      actor: currentUser.name,
      type: "PROJECT_UPDATE",
      description: `${form.type === "RISK" ? "Risk" : "Issue"} updated: "${form.title.trim()}"`,
    })
    toast.success("Updated successfully.")
    resetForm()
    setEditOpen(false)
  }

  const formFields = (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="risk-title">Title</Label>
        <Input
          id="risk-title"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Brief description of the risk or issue"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label>Type</Label>
          <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as RiskIssueType }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="RISK">Risk</SelectItem>
              <SelectItem value="ISSUE">Issue</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as RiskFormState["status"] }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="MITIGATED">Mitigated</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <Label>Likelihood</Label>
          <Select value={form.likelihood} onValueChange={(v) => setForm((f) => ({ ...f, likelihood: v as Likelihood }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Impact</Label>
          <Select value={form.impact} onValueChange={(v) => setForm((f) => ({ ...f, impact: v as Impact }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>RAG</Label>
          <Select value={form.ragStatus} onValueChange={(v) => setForm((f) => ({ ...f, ragStatus: v as RAGStatus }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="GREEN">Green</SelectItem>
              <SelectItem value="AMBER">Amber</SelectItem>
              <SelectItem value="RED">Red</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="risk-owner">Owner</Label>
        <Input
          id="risk-owner"
          value={form.owner}
          onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
          placeholder="Person responsible for mitigation"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="risk-mitigation">Mitigation / Resolution</Label>
        <Textarea
          id="risk-mitigation"
          value={form.mitigation}
          onChange={(e) => setForm((f) => ({ ...f, mitigation: e.target.value }))}
          placeholder="Mitigation strategy or resolution plan"
          className="min-h-[60px] resize-none text-sm"
        />
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {risks.length} risk(s) / issue(s)
        </h3>
        {canEdit && (
          <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) resetForm() }}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setAddOpen(true)}>
              <Plus className="size-3" />
              Add Risk / Issue
            </Button>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Add Risk / Issue</DialogTitle></DialogHeader>
              {formFields}
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={handleAdd}>Add</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {risks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ShieldAlert className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No risks or issues recorded.</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden md:table-cell">Likelihood</TableHead>
                <TableHead className="hidden md:table-cell">Impact</TableHead>
                <TableHead>RAG</TableHead>
                <TableHead className="hidden lg:table-cell">Owner</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && (
                  <TableHead className="w-10">
                    <span className="sr-only">Edit</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {risks.map((risk) => {
                const Icon = typeIcons[risk.type]
                return (
                  <TableRow key={risk.id}>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{risk.title}</span>
                        <span className="text-xs text-muted-foreground line-clamp-1 hidden lg:block">
                          {risk.mitigation}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs gap-1">
                        <Icon className="size-3" />
                        {risk.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="secondary" className="text-xs">{risk.likelihood}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="secondary" className="text-xs">{risk.impact}</Badge>
                    </TableCell>
                    <TableCell>
                      <RAGBadge status={risk.ragStatus} />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {risk.owner}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusStyles[risk.status]}>
                        {risk.status}
                      </Badge>
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => openEdit(risk)}
                        >
                          <Pencil className="size-3.5" />
                          <span className="sr-only">Edit {risk.title}</span>
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) resetForm() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Risk / Issue</DialogTitle></DialogHeader>
          {formFields}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
