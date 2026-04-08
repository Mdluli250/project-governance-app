"use client"

import { useState } from "react"
import type { Project, Classification, RiskComplexity, ReputationalRisk } from "@/lib/types"
import { deriveClassification } from "@/lib/rules"
import { canPerformAction } from "@/lib/rules"
import { useAuth, useData } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClassificationBadge } from "@/components/classification-badge"
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
  Calendar,
  DollarSign,
  User,
  Target,
  Building2,
  Layers,
  Pencil,
} from "lucide-react"
import { toast } from "sonner"

interface OverviewTabProps {
  project: Project
}

export function OverviewTab({ project }: OverviewTabProps) {
  const { currentUser, users } = useAuth()
  const { updateProject, addAuditEntry, pocCadence, clusters, impactAreas: allImpactAreas, strategicObjectives } = useData()
  const canEdit = canPerformAction(currentUser, "EDIT_PROJECT")

  const pm = users.find((u) => u.id === project.pmId)
  const cadence = pocCadence[project.classification]
  const alignedSOs = strategicObjectives.filter((so) =>
    project.strategicObjectives.includes(so.id)
  )

  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState({
    shortTitle: project.shortTitle,
    longTitle: project.longTitle,
    cluster: project.cluster,
    impactArea: project.impactArea,
    sponsorName: project.sponsorName,
    contractValue: project.contractValue,
    contractTerm: project.contractTerm,
    thisYearAmount: project.thisYearAmount,
    startDate: project.startDate,
    endDate: project.endDate,
    riskComplexity: project.riskComplexity,
    reputationalRisk: project.reputationalRisk,
    strategicObjectives: [...project.strategicObjectives],
  })

  function openEditDialog() {
    setForm({
      shortTitle: project.shortTitle,
      longTitle: project.longTitle,
      cluster: project.cluster,
      impactArea: project.impactArea,
      sponsorName: project.sponsorName,
      contractValue: project.contractValue,
      contractTerm: project.contractTerm,
      thisYearAmount: project.thisYearAmount,
      startDate: project.startDate,
      endDate: project.endDate,
      riskComplexity: project.riskComplexity,
      reputationalRisk: project.reputationalRisk,
      strategicObjectives: [...project.strategicObjectives],
    })
    setEditOpen(true)
  }

  function handleSave() {
    if (!form.shortTitle.trim() || !form.longTitle.trim()) {
      toast.error("Project title is required.")
      return
    }
    const newClassification = deriveClassification(
      form.contractValue,
      form.riskComplexity,
      form.reputationalRisk
    )
    const classChanged = newClassification !== project.classification

    updateProject(project.id, {
      shortTitle: form.shortTitle.trim(),
      longTitle: form.longTitle.trim(),
      cluster: form.cluster,
      impactArea: form.impactArea,
      sponsorName: form.sponsorName.trim(),
      contractValue: form.contractValue,
      contractTerm: form.contractTerm,
      thisYearAmount: form.thisYearAmount,
      startDate: form.startDate,
      endDate: form.endDate,
      riskComplexity: form.riskComplexity,
      reputationalRisk: form.reputationalRisk,
      strategicObjectives: form.strategicObjectives,
      classification: newClassification,
    })

    addAuditEntry({
      projectId: project.id,
      actor: currentUser.name,
      type: classChanged ? "CLASSIFICATION_CHANGE" : "PROJECT_UPDATE",
      description: classChanged
        ? `Classification changed from ${project.classification} to ${newClassification} based on updated parameters.`
        : "Project details updated.",
      oldValue: classChanged ? `Class ${project.classification}` : undefined,
      newValue: classChanged ? `Class ${newClassification}` : undefined,
    })

    toast.success("Project updated successfully.")
    setEditOpen(false)
  }

  function toggleSO(soId: string) {
    setForm((f) => ({
      ...f,
      strategicObjectives: f.strategicObjectives.includes(soId)
        ? f.strategicObjectives.filter((id) => id !== soId)
        : [...f.strategicObjectives, soId],
    }))
  }

  const impactAreas = allImpactAreas[form.cluster] ?? []

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <ClassificationBadge classification={project.classification} />
            <Badge variant="outline">{cadence?.label}</Badge>
            <Badge variant="secondary">{cadence?.frequency}</Badge>
          </div>
          <h2 className="text-lg font-semibold text-balance">{project.longTitle}</h2>
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={openEditDialog}>
            <Pencil className="size-3.5" />
            Edit Project
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Classification Basis */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Layers className="size-4" />
              Classification Basis
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Contract Value</span>
              <span className="text-sm font-medium">R{project.contractValue}m</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Risk/Complexity</span>
              <Badge variant="outline">{project.riskComplexity}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Reputational Risk</span>
              <Badge variant="outline">{project.reputationalRisk}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Contract Metadata */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <DollarSign className="size-4" />
              Contract Metadata
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Value</span>
              <span className="text-sm font-medium">R{project.contractValue}m</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Term</span>
              <span className="text-sm font-medium">{project.contractTerm} years</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">This FY</span>
              <span className="text-sm font-medium">R{project.thisYearAmount}m</span>
            </div>
          </CardContent>
        </Card>

        {/* People */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <User className="size-4" />
              Key People
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Project Manager</span>
              <span className="text-sm font-medium">{pm?.name ?? "N/A"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Sponsor</span>
              <span className="text-sm font-medium">{project.sponsorName}</span>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="size-4" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Start</span>
              <span className="text-sm font-medium">
                {new Date(project.startDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">End</span>
              <span className="text-sm font-medium">
                {new Date(project.endDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last Updated</span>
              <span className="text-sm font-medium">
                {new Date(project.lastUpdated).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Organisational Context */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Building2 className="size-4" />
              Organisational Context
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Cluster</span>
              <span className="text-sm font-medium">{project.cluster}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Impact Area</span>
              <span className="text-sm font-medium">{project.impactArea}</span>
            </div>
          </CardContent>
        </Card>

        {/* Strategic Alignment */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Target className="size-4" />
              Strategic Alignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {alignedSOs.map((so) => (
                <Badge key={so.id} variant="secondary" className="text-xs">
                  {so.label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Project Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-short-title">Short Title</Label>
              <Input
                id="edit-short-title"
                value={form.shortTitle}
                onChange={(e) => setForm((f) => ({ ...f, shortTitle: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-long-title">Long Title</Label>
              <Input
                id="edit-long-title"
                value={form.longTitle}
                onChange={(e) => setForm((f) => ({ ...f, longTitle: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-cluster">Cluster</Label>
                <Select
                  value={form.cluster}
                  onValueChange={(v) => setForm((f) => ({ ...f, cluster: v, impactArea: "" }))}
                >
                  <SelectTrigger id="edit-cluster"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {clusters.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-ia">Impact Area</Label>
                <Select
                  value={form.impactArea}
                  onValueChange={(v) => setForm((f) => ({ ...f, impactArea: v }))}
                >
                  <SelectTrigger id="edit-ia"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {impactAreas.map((ia) => (
                      <SelectItem key={ia} value={ia}>{ia}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-sponsor">Sponsor</Label>
              <Input
                id="edit-sponsor"
                value={form.sponsorName}
                onChange={(e) => setForm((f) => ({ ...f, sponsorName: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-cv">Contract Value (Rm)</Label>
                <Input
                  id="edit-cv"
                  type="number"
                  value={form.contractValue}
                  onChange={(e) => setForm((f) => ({ ...f, contractValue: Number(e.target.value) }))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-ct">Term (years)</Label>
                <Input
                  id="edit-ct"
                  type="number"
                  value={form.contractTerm}
                  onChange={(e) => setForm((f) => ({ ...f, contractTerm: Number(e.target.value) }))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-fy">This FY (Rm)</Label>
                <Input
                  id="edit-fy"
                  type="number"
                  value={form.thisYearAmount}
                  onChange={(e) => setForm((f) => ({ ...f, thisYearAmount: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-start">Start Date</Label>
                <Input
                  id="edit-start"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-end">End Date</Label>
                <Input
                  id="edit-end"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Risk / Complexity</Label>
                <Select
                  value={form.riskComplexity}
                  onValueChange={(v) => setForm((f) => ({ ...f, riskComplexity: v as RiskComplexity }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Reputational Risk</Label>
                <Select
                  value={form.reputationalRisk}
                  onValueChange={(v) => setForm((f) => ({ ...f, reputationalRisk: v as ReputationalRisk }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Derived Classification</Label>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Based on current values:</span>
                <ClassificationBadge
                  classification={deriveClassification(form.contractValue, form.riskComplexity, form.reputationalRisk)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Strategic Objectives</Label>
              <div className="flex flex-col gap-1.5">
                {strategicObjectives.map((so) => (
                  <label
                    key={so.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted cursor-pointer"
                  >
                    <Checkbox
                      checked={form.strategicObjectives.includes(so.id)}
                      onCheckedChange={() => toggleSO(so.id)}
                    />
                    <span>{so.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
