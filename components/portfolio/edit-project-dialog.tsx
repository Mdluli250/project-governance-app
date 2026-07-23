"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth, useData } from "@/lib/store"
import { deriveClassification } from "@/lib/rules"
import { validateEditProjectForm, type EditProjectFormState, type ValidationErrors } from "@/lib/validators/edit-project-form"
import type { Project, Classification, RiskComplexity, ReputationalRisk } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"

interface EditProjectDialogProps {
  project: Project
  open: boolean
  onOpenChange: (open: boolean) => void
}

function projectToFormState(project: Project): EditProjectFormState {
  return {
    shortTitle: project.shortTitle,
    longTitle: project.longTitle,
    cluster: project.cluster,
    impactArea: project.impactArea,
    pmId: project.pmId,
    sponsorName: project.sponsorName,
    strategicObjectives: [...project.strategicObjectives],
    contractValue: project.contractValue ? String(project.contractValue) : "",
    contractTerm: project.contractTerm ? String(project.contractTerm) : "",
    thisYearAmount: project.thisYearAmount ? String(project.thisYearAmount) : "",
    startDate: project.startDate,
    endDate: project.endDate,
    riskComplexity: project.riskComplexity,
    reputationalRisk: project.reputationalRisk,
    healthNarrative: project.healthNarrative,
  }
}

export function EditProjectDialog({ project, open, onOpenChange }: EditProjectDialogProps) {
  const { currentUser, users } = useAuth()
  const { clusters, impactAreas, strategicObjectives, updateProject, addAuditEntry } = useData()
  const { toast } = useToast()

  const [form, setForm] = useState<EditProjectFormState>(projectToFormState(project))
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [submitting, setSubmitting] = useState(false)

  // Re-populate form when project changes or dialog opens
  useEffect(() => {
    if (open) {
      setForm(projectToFormState(project))
      setErrors({})
    }
  }, [open, project])

  const derivedClass: Classification = deriveClassification(
    Number(form.contractValue) || 0,
    form.riskComplexity as RiskComplexity,
    form.reputationalRisk as ReputationalRisk
  )

  const availableImpactAreas = form.cluster ? impactAreas[form.cluster] ?? [] : []
  const pms = users.filter((u) => u.role === "PM" || u.role === "ADMIN")

  const toggleSO = useCallback((soId: string) => {
    setForm((prev) => ({
      ...prev,
      strategicObjectives: prev.strategicObjectives.includes(soId)
        ? prev.strategicObjectives.filter((s) => s !== soId)
        : [...prev.strategicObjectives, soId],
    }))
  }, [])

  function handleCancel() {
    onOpenChange(false)
  }

  async function handleSubmit() {
    // Validate
    const validationErrors = validateEditProjectForm(form)
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setSubmitting(true)

    try {
      const updates: Partial<Project> = {
        shortTitle: form.shortTitle.trim(),
        longTitle: form.longTitle.trim() || form.shortTitle.trim(),
        classification: derivedClass,
        cluster: form.cluster,
        impactArea: form.impactArea,
        pmId: form.pmId,
        sponsorName: form.sponsorName.trim(),
        strategicObjectives: form.strategicObjectives,
        contractValue: Number(form.contractValue) || 0,
        contractTerm: Number(form.contractTerm) || 0,
        startDate: form.startDate,
        endDate: form.endDate,
        thisYearAmount: Number(form.thisYearAmount) || 0,
        riskComplexity: form.riskComplexity as RiskComplexity,
        reputationalRisk: form.reputationalRisk as ReputationalRisk,
        healthNarrative: form.healthNarrative.trim(),
      }

      updateProject(project.id, updates)

      addAuditEntry({
        projectId: project.id,
        actor: currentUser.name,
        type: "PROJECT_UPDATE",
        description: `Project "${form.shortTitle.trim()}" updated (Class ${derivedClass}).`,
      })

      const successToast = toast({
        title: "Project updated",
        description: `"${form.shortTitle.trim()}" has been updated successfully.`,
      })

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        successToast.dismiss()
      }, 5000)

      onOpenChange(false)
    } catch {
      toast({
        title: "Update failed",
        description: "Failed to save project changes. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleCancel(); else onOpenChange(v) }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Title */}
          <div className="grid gap-1.5">
            <Label htmlFor="ep-short" className="text-xs font-medium">Short Title *</Label>
            <Input
              id="ep-short"
              placeholder="e.g. Smart Grid Pilot"
              value={form.shortTitle}
              onChange={(e) => setForm((p) => ({ ...p, shortTitle: e.target.value }))}
              className="h-8 text-sm"
            />
            {errors.shortTitle && <p className="text-xs text-destructive">{errors.shortTitle}</p>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ep-long" className="text-xs font-medium">Full Title</Label>
            <Input
              id="ep-long"
              placeholder="Full project title"
              value={form.longTitle}
              onChange={(e) => setForm((p) => ({ ...p, longTitle: e.target.value }))}
              className="h-8 text-sm"
            />
            {errors.longTitle && <p className="text-xs text-destructive">{errors.longTitle}</p>}
          </div>

          {/* Cluster / Impact Area */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium">Cluster *</Label>
              <Select value={form.cluster} onValueChange={(v) => setForm((p) => ({ ...p, cluster: v, impactArea: "" }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select cluster" /></SelectTrigger>
                <SelectContent>
                  {clusters.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                </SelectContent>
              </Select>
              {errors.cluster && <p className="text-xs text-destructive">{errors.cluster}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium">Impact Area</Label>
              <Select value={form.impactArea} onValueChange={(v) => setForm((p) => ({ ...p, impactArea: v }))} disabled={!form.cluster}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select area" /></SelectTrigger>
                <SelectContent>
                  {availableImpactAreas.map((ia) => (<SelectItem key={ia} value={ia}>{ia}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* PM / Sponsor */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium">Project Manager *</Label>
              <Select value={form.pmId} onValueChange={(v) => setForm((p) => ({ ...p, pmId: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select PM" /></SelectTrigger>
                <SelectContent>
                  {pms.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}
                </SelectContent>
              </Select>
              {errors.pmId && <p className="text-xs text-destructive">{errors.pmId}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ep-sponsor" className="text-xs font-medium">Sponsor</Label>
              <Input
                id="ep-sponsor"
                placeholder="Sponsor name"
                value={form.sponsorName}
                onChange={(e) => setForm((p) => ({ ...p, sponsorName: e.target.value }))}
                className="h-8 text-sm"
              />
              {errors.sponsorName && <p className="text-xs text-destructive">{errors.sponsorName}</p>}
            </div>
          </div>

          {/* Contract / Finance */}
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ep-cv" className="text-xs font-medium">Contract Value (R m)</Label>
              <Input
                id="ep-cv"
                type="number"
                min="0"
                step="0.1"
                placeholder="0"
                value={form.contractValue}
                onChange={(e) => setForm((p) => ({ ...p, contractValue: e.target.value }))}
                className="h-8 text-sm"
              />
              {errors.contractValue && <p className="text-xs text-destructive">{errors.contractValue}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ep-ct" className="text-xs font-medium">Term (months)</Label>
              <Input
                id="ep-ct"
                type="number"
                min="0"
                placeholder="0"
                value={form.contractTerm}
                onChange={(e) => setForm((p) => ({ ...p, contractTerm: e.target.value }))}
                className="h-8 text-sm"
              />
              {errors.contractTerm && <p className="text-xs text-destructive">{errors.contractTerm}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ep-tya" className="text-xs font-medium">This Year (R m)</Label>
              <Input
                id="ep-tya"
                type="number"
                min="0"
                step="0.1"
                placeholder="0"
                value={form.thisYearAmount}
                onChange={(e) => setForm((p) => ({ ...p, thisYearAmount: e.target.value }))}
                className="h-8 text-sm"
              />
              {errors.thisYearAmount && <p className="text-xs text-destructive">{errors.thisYearAmount}</p>}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ep-start" className="text-xs font-medium">Start Date</Label>
              <Input
                id="ep-start"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ep-end" className="text-xs font-medium">End Date</Label>
              <Input
                id="ep-end"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                className="h-8 text-sm"
              />
              {errors.endDate && <p className="text-xs text-destructive">{errors.endDate}</p>}
            </div>
          </div>

          {/* Risk Classification */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium">Risk / Complexity</Label>
              <Select value={form.riskComplexity} onValueChange={(v) => setForm((p) => ({ ...p, riskComplexity: v as RiskComplexity }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium">Reputational Risk</Label>
              <Select value={form.reputationalRisk} onValueChange={(v) => setForm((p) => ({ ...p, reputationalRisk: v as ReputationalRisk }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Derived classification */}
          <div className="flex items-center gap-2 rounded-md border px-3 py-2 bg-muted/30">
            <span className="text-xs text-muted-foreground">Derived Classification:</span>
            <Badge variant="outline" className="text-xs font-semibold">Class {derivedClass}</Badge>
            <span className="text-[10px] text-muted-foreground ml-auto">Based on 2-of-3 rule</span>
          </div>

          {/* Strategic Objectives */}
          <div className="grid gap-1.5">
            <Label className="text-xs font-medium">Strategic Objectives</Label>
            <div className="grid gap-1.5">
              {strategicObjectives.map((so) => (
                <div key={so.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`ep-so-${so.id}`}
                    checked={form.strategicObjectives.includes(so.id)}
                    onCheckedChange={() => toggleSO(so.id)}
                  />
                  <label htmlFor={`ep-so-${so.id}`} className="text-xs cursor-pointer">{so.label}</label>
                </div>
              ))}
            </div>
          </div>

          {/* Health Narrative */}
          <div className="grid gap-1.5">
            <Label htmlFor="ep-narrative" className="text-xs font-medium">Health Narrative</Label>
            <Textarea
              id="ep-narrative"
              placeholder="Project health summary..."
              value={form.healthNarrative}
              onChange={(e) => setForm((p) => ({ ...p, healthNarrative: e.target.value }))}
              className="min-h-[60px] text-sm"
            />
            {errors.healthNarrative && <p className="text-xs text-destructive">{errors.healthNarrative}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
