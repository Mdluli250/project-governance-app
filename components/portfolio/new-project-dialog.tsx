"use client"

import { useState } from "react"
import { useAuth, useData } from "@/lib/store"
import { deriveClassification } from "@/lib/rules"
import type { Project, Classification, RiskComplexity, ReputationalRisk, RAGDimensions } from "@/lib/types"
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

const DEFAULT_RAG: RAGDimensions = {
  overall: "GREEN",
  scope: "GREEN",
  schedule: "GREEN",
  cost: "GREEN",
  quality: "GREEN",
  risk: "GREEN",
  sheq: "GREEN",
  data: "GREEN",
  compliance: "GREEN",
}

interface NewProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewProjectDialog({ open, onOpenChange }: NewProjectDialogProps) {
  const { currentUser, users } = useAuth()
  const { clusters, impactAreas, strategicObjectives, addProject, addAuditEntry } = useData()
  const { toast } = useToast()

  const [form, setForm] = useState({
    shortTitle: "",
    longTitle: "",
    cluster: "",
    impactArea: "",
    pmId: currentUser.id,
    sponsorName: "",
    strategicObjectives: [] as string[],
    contractValue: "",
    contractTerm: "",
    startDate: "",
    endDate: "",
    thisYearAmount: "",
    riskComplexity: "LOW" as RiskComplexity,
    reputationalRisk: "LOW" as ReputationalRisk,
    healthNarrative: "",
  })

  const derivedClass: Classification = deriveClassification(
    Number(form.contractValue) || 0,
    form.riskComplexity,
    form.reputationalRisk
  )

  const availableImpactAreas = form.cluster ? impactAreas[form.cluster] ?? [] : []
  const pms = users.filter((u) => u.role === "PM" || u.role === "ADMIN")

  function resetForm() {
    setForm({
      shortTitle: "",
      longTitle: "",
      cluster: "",
      impactArea: "",
      pmId: currentUser.id,
      sponsorName: "",
      strategicObjectives: [],
      contractValue: "",
      contractTerm: "",
      startDate: "",
      endDate: "",
      thisYearAmount: "",
      riskComplexity: "LOW",
      reputationalRisk: "LOW",
      healthNarrative: "",
    })
  }

  function toggleSO(soId: string) {
    setForm((prev) => ({
      ...prev,
      strategicObjectives: prev.strategicObjectives.includes(soId)
        ? prev.strategicObjectives.filter((s) => s !== soId)
        : [...prev.strategicObjectives, soId],
    }))
  }

  function handleSubmit() {
    if (!form.shortTitle.trim() || !form.cluster || !form.pmId) {
      toast({ title: "Missing required fields", description: "Short title, cluster, and project manager are required.", variant: "destructive" })
      return
    }

    const newProject: Project = {
      id: `p${Date.now()}`,
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
      startDate: form.startDate || new Date().toISOString().split("T")[0],
      endDate: form.endDate || "",
      thisYearAmount: Number(form.thisYearAmount) || 0,
      riskComplexity: form.riskComplexity,
      reputationalRisk: form.reputationalRisk,
      rag: { ...DEFAULT_RAG },
      healthNarrative: form.healthNarrative.trim(),
      lastUpdated: new Date().toISOString().split("T")[0],
    }

    addProject(newProject)
    addAuditEntry({
      projectId: newProject.id,
      actor: currentUser.name,
      type: "PROJECT_UPDATE",
      description: `New project "${newProject.shortTitle}" created (Class ${derivedClass}).`,
    })

    toast({ title: "Project created", description: `"${newProject.shortTitle}" has been added to the portfolio.` })
    resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm() }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Title */}
          <div className="grid gap-1.5">
            <Label htmlFor="np-short" className="text-xs font-medium">Short Title *</Label>
            <Input id="np-short" placeholder="e.g. Smart Grid Pilot" value={form.shortTitle} onChange={(e) => setForm((p) => ({ ...p, shortTitle: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="np-long" className="text-xs font-medium">Full Title</Label>
            <Input id="np-long" placeholder="Full project title" value={form.longTitle} onChange={(e) => setForm((p) => ({ ...p, longTitle: e.target.value }))} className="h-8 text-sm" />
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
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="np-sponsor" className="text-xs font-medium">Sponsor</Label>
              <Input id="np-sponsor" placeholder="Sponsor name" value={form.sponsorName} onChange={(e) => setForm((p) => ({ ...p, sponsorName: e.target.value }))} className="h-8 text-sm" />
            </div>
          </div>

          {/* Contract / Finance */}
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="np-cv" className="text-xs font-medium">Contract Value (R m)</Label>
              <Input id="np-cv" type="number" min="0" step="0.1" placeholder="0" value={form.contractValue} onChange={(e) => setForm((p) => ({ ...p, contractValue: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="np-ct" className="text-xs font-medium">Term (months)</Label>
              <Input id="np-ct" type="number" min="0" placeholder="0" value={form.contractTerm} onChange={(e) => setForm((p) => ({ ...p, contractTerm: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="np-tya" className="text-xs font-medium">This Year (R m)</Label>
              <Input id="np-tya" type="number" min="0" step="0.1" placeholder="0" value={form.thisYearAmount} onChange={(e) => setForm((p) => ({ ...p, thisYearAmount: e.target.value }))} className="h-8 text-sm" />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="np-start" className="text-xs font-medium">Start Date</Label>
              <Input id="np-start" type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="np-end" className="text-xs font-medium">End Date</Label>
              <Input id="np-end" type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} className="h-8 text-sm" />
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
                    id={`np-so-${so.id}`}
                    checked={form.strategicObjectives.includes(so.id)}
                    onCheckedChange={() => toggleSO(so.id)}
                  />
                  <label htmlFor={`np-so-${so.id}`} className="text-xs cursor-pointer">{so.label}</label>
                </div>
              ))}
            </div>
          </div>

          {/* Health Narrative */}
          <div className="grid gap-1.5">
            <Label htmlFor="np-narrative" className="text-xs font-medium">Health Narrative</Label>
            <Textarea id="np-narrative" placeholder="Initial project health summary..." value={form.healthNarrative} onChange={(e) => setForm((p) => ({ ...p, healthNarrative: e.target.value }))} className="min-h-[60px] text-sm" />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit}>Create Project</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
