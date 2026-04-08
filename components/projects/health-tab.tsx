"use client"

import { useState } from "react"
import type { Project, RAGStatus, RAGDimensions } from "@/lib/types"
import { RAG_DIMENSION_KEYS } from "@/lib/types"
import { DIMENSION_LABELS } from "@/lib/constants"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RAGBadge } from "@/components/rag-badge"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth, useData } from "@/lib/store"
import { canPerformAction, deriveOverallRAG } from "@/lib/rules"
import { Activity, Pencil, Save, X } from "lucide-react"
import { toast } from "sonner"

interface HealthTabProps {
  project: Project
  onNarrativeChange?: (narrative: string) => void
}

const RAG_OPTIONS: { value: RAGStatus; label: string }[] = [
  { value: "GREEN", label: "Green" },
  { value: "AMBER", label: "Amber" },
  { value: "RED", label: "Red" },
]

export function HealthTab({ project, onNarrativeChange }: HealthTabProps) {
  const { currentUser } = useAuth()
  const { updateProject, addAuditEntry } = useData()
  const canEdit = canPerformAction(currentUser, "EDIT_PROJECT")

  const [editingRAG, setEditingRAG] = useState(false)
  const [ragDraft, setRagDraft] = useState<RAGDimensions>({ ...project.rag })

  function startEditRAG() {
    setRagDraft({ ...project.rag })
    setEditingRAG(true)
  }

  function cancelEditRAG() {
    setEditingRAG(false)
  }

  function saveRAG() {
    const changes: string[] = []
    const allKeys = ["overall", ...RAG_DIMENSION_KEYS] as (keyof RAGDimensions)[]
    for (const dim of allKeys) {
      if (ragDraft[dim] !== project.rag[dim]) {
        const label = dim === "overall" ? "Overall" : DIMENSION_LABELS[dim] ?? dim
        changes.push(`${label}: ${project.rag[dim]} -> ${ragDraft[dim]}`)
      }
    }

    if (changes.length === 0) {
      setEditingRAG(false)
      return
    }

    // Create a fresh copy so React detects the state change
    const newRag: RAGDimensions = {
      overall: ragDraft.overall,
      scope: ragDraft.scope,
      schedule: ragDraft.schedule,
      cost: ragDraft.cost,
      quality: ragDraft.quality,
      risk: ragDraft.risk,
      sheq: ragDraft.sheq,
      data: ragDraft.data,
      compliance: ragDraft.compliance,
    }
    updateProject(project.id, { rag: newRag })
    addAuditEntry({
      projectId: project.id,
      actor: currentUser.name,
      type: "RAG_CHANGE",
      description: `RAG dimensions updated: ${changes.join("; ")}`,
      oldValue: changes.map((c) => c.split(" -> ")[0]).join(", "),
      newValue: changes.map((c) => c.split(" -> ")[1]).join(", "),
    })

    toast.success("RAG dimensions updated.")
    setEditingRAG(false)
  }

  function updateDimension(dim: keyof RAGDimensions, value: RAGStatus) {
    setRagDraft((prev) => {
      const next = { ...prev, [dim]: value }
      // If a sub-dimension changed, auto-derive overall from worst-of rule
      if (dim !== "overall") {
        next.overall = deriveOverallRAG(next)
      }
      return next
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Overall Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Overall Project Health</span>
            <div className="flex items-center gap-2">
              {editingRAG ? (
                <div className="flex items-center gap-2">
                  <RAGBadge status={ragDraft.overall} variant="large" />
                  <span className="text-[10px] text-muted-foreground">(auto-derived)</span>
                  <Select
                    value={ragDraft.overall}
                    onValueChange={(v) => updateDimension("overall", v as RAGStatus)}
                  >
                    <SelectTrigger className="w-24 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RAG_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <RAGBadge status={project.rag.overall} variant="large" />
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted-foreground">
              Health Narrative
            </label>
            <Textarea
              value={project.healthNarrative}
              onChange={(e) => onNarrativeChange?.(e.target.value)}
              disabled={!canEdit}
              className="min-h-[80px] resize-none text-sm"
              placeholder="Provide health narrative..."
            />
            {!canEdit && (
              <p className="text-xs text-muted-foreground">
                Only the Project Manager or Admin can update the health narrative.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dimension Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Activity className="size-4" />
            Monitoring Dimensions
          </h3>
          {canEdit && !editingRAG && (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={startEditRAG}>
              <Pencil className="size-3" />
              Edit RAG
            </Button>
          )}
          {editingRAG && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={cancelEditRAG}>
                <X className="size-3" />
                Cancel
              </Button>
              <Button size="sm" className="gap-1.5 text-xs" onClick={saveRAG}>
                <Save className="size-3" />
                Save
              </Button>
            </div>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {RAG_DIMENSION_KEYS.map((dim) => (
            <Card key={dim}>
              <CardContent className="flex items-center justify-between pt-4 pb-4">
                <span className="text-sm font-medium">
                  {DIMENSION_LABELS[dim]}
                </span>
                {editingRAG ? (
                  <Select
                    value={ragDraft[dim]}
                    onValueChange={(v) => updateDimension(dim, v as RAGStatus)}
                  >
                    <SelectTrigger className="w-24 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RAG_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <RAGBadge status={project.rag[dim]} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
