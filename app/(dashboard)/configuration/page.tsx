"use client"

import { useState } from "react"
import { useAuth, useData } from "@/lib/store"
import type { StrategicObjective, ChecklistSection, ActionCategoryItem, ClassificationThreshold, POCCadenceItem } from "@/lib/store"
import { canPerformAction } from "@/lib/rules"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  AlertCircle,
  Building2,
  Target,
  ClipboardCheck,
  Tags,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  ShieldAlert,
} from "lucide-react"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ConfigurationPage() {
  const { currentUser } = useAuth()
  const isAdmin = canPerformAction(currentUser, "MANAGE_CONFIG")

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ShieldAlert className="size-12 text-muted-foreground/30 mb-4" />
        <h2 className="text-lg font-semibold">Access Restricted</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Only administrators can access system configuration.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-balance">
          System Configuration
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage clusters, impact areas, strategic objectives, checklists, action categories, and classification rules.
        </p>
      </div>

      <Tabs defaultValue="clusters" className="w-full">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-transparent p-0">
          <TabsTrigger value="clusters" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Building2 className="size-3.5" />
            Clusters
          </TabsTrigger>
          <TabsTrigger value="objectives" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Target className="size-3.5" />
            Strategic Objectives
          </TabsTrigger>
          <TabsTrigger value="checklist" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ClipboardCheck className="size-3.5" />
            Checklist Template
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Tags className="size-3.5" />
            Action Categories
          </TabsTrigger>
          <TabsTrigger value="classification" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <AlertCircle className="size-3.5" />
            Classification Rules
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="clusters">
            <ClustersConfig />
          </TabsContent>
          <TabsContent value="objectives">
            <ObjectivesConfig />
          </TabsContent>
          <TabsContent value="checklist">
            <ChecklistConfig />
          </TabsContent>
          <TabsContent value="categories">
            <CategoriesConfig />
          </TabsContent>
          <TabsContent value="classification">
            <ClassificationRulesView />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

/* ── Clusters & Impact Areas ─────────────────────────────── */
function ClustersConfig() {
  const { clusters, impactAreas, setClusters, setImpactAreas } = useData()
  const [addClusterOpen, setAddClusterOpen] = useState(false)
  const [newClusterName, setNewClusterName] = useState("")
  const [editCluster, setEditCluster] = useState<string | null>(null)
  const [editClusterName, setEditClusterName] = useState("")
  const [addImpactAreaCluster, setAddImpactAreaCluster] = useState<string | null>(null)
  const [newImpactAreaName, setNewImpactAreaName] = useState("")

  function handleAddCluster() {
    const name = newClusterName.trim()
    if (!name) return
    if (clusters.includes(name)) {
      toast.error("Cluster already exists.")
      return
    }
    setClusters([...clusters, name])
    setImpactAreas({ ...impactAreas, [name]: [] })
    setNewClusterName("")
    setAddClusterOpen(false)
    toast.success(`Cluster "${name}" added.`)
  }

  function handleEditCluster() {
    const name = editClusterName.trim()
    if (!name || !editCluster) return
    if (name !== editCluster && clusters.includes(name)) {
      toast.error("Cluster already exists.")
      return
    }
    const newClusters = clusters.map((c) => (c === editCluster ? name : c))
    const newAreas = { ...impactAreas }
    if (name !== editCluster) {
      newAreas[name] = newAreas[editCluster] || []
      delete newAreas[editCluster]
    }
    setClusters(newClusters)
    setImpactAreas(newAreas)
    setEditCluster(null)
    toast.success(`Cluster renamed to "${name}".`)
  }

  function handleDeleteCluster(cluster: string) {
    setClusters(clusters.filter((c) => c !== cluster))
    const newAreas = { ...impactAreas }
    delete newAreas[cluster]
    setImpactAreas(newAreas)
    toast.success(`Cluster "${cluster}" removed.`)
  }

  function handleAddImpactArea() {
    const name = newImpactAreaName.trim()
    if (!name || !addImpactAreaCluster) return
    const existing = impactAreas[addImpactAreaCluster] || []
    if (existing.includes(name)) {
      toast.error("Impact area already exists.")
      return
    }
    setImpactAreas({
      ...impactAreas,
      [addImpactAreaCluster]: [...existing, name],
    })
    setNewImpactAreaName("")
    setAddImpactAreaCluster(null)
    toast.success(`Impact area "${name}" added.`)
  }

  function handleDeleteImpactArea(cluster: string, area: string) {
    setImpactAreas({
      ...impactAreas,
      [cluster]: (impactAreas[cluster] || []).filter((a) => a !== area),
    })
    toast.success(`Impact area "${area}" removed.`)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Clusters & Impact Areas</h2>
          <p className="text-sm text-muted-foreground">Manage the organizational structure for project classification.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setAddClusterOpen(true)}>
          <Plus className="size-4" /> Add Cluster
        </Button>
      </div>

      <div className="grid gap-4">
        {clusters.map((cluster) => (
          <Card key={cluster}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="size-4 text-muted-foreground" />
                  {cluster}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => {
                      setEditCluster(cluster)
                      setEditClusterName(cluster)
                    }}
                  >
                    <Pencil className="size-3.5" />
                    <span className="sr-only">Edit cluster</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteCluster(cluster)}
                  >
                    <Trash2 className="size-3.5" />
                    <span className="sr-only">Delete cluster</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(impactAreas[cluster] || []).map((area) => (
                  <Badge
                    key={area}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {area}
                    <button
                      onClick={() => handleDeleteImpactArea(cluster, area)}
                      className="ml-1 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors"
                      aria-label={`Remove ${area}`}
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </Badge>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs gap-1"
                  onClick={() => {
                    setAddImpactAreaCluster(cluster)
                    setNewImpactAreaName("")
                  }}
                >
                  <Plus className="size-3" /> Add
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Cluster Dialog */}
      <Dialog open={addClusterOpen} onOpenChange={setAddClusterOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Cluster</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <Label htmlFor="new-cluster">Cluster Name</Label>
            <Input
              id="new-cluster"
              value={newClusterName}
              onChange={(e) => setNewClusterName(e.target.value)}
              placeholder="e.g. Smart Energy"
              onKeyDown={(e) => e.key === "Enter" && handleAddCluster()}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleAddCluster}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Cluster Dialog */}
      <Dialog open={!!editCluster} onOpenChange={(open) => { if (!open) setEditCluster(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Cluster</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <Label htmlFor="edit-cluster">Cluster Name</Label>
            <Input
              id="edit-cluster"
              value={editClusterName}
              onChange={(e) => setEditClusterName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEditCluster()}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleEditCluster}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Impact Area Dialog */}
      <Dialog open={!!addImpactAreaCluster} onOpenChange={(open) => { if (!open) setAddImpactAreaCluster(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Impact Area to {addImpactAreaCluster}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <Label htmlFor="new-ia">Impact Area Name</Label>
            <Input
              id="new-ia"
              value={newImpactAreaName}
              onChange={(e) => setNewImpactAreaName(e.target.value)}
              placeholder="e.g. Renewable Systems"
              onKeyDown={(e) => e.key === "Enter" && handleAddImpactArea()}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleAddImpactArea}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ── Strategic Objectives ────────────────────────────────── */
function ObjectivesConfig() {
  const { strategicObjectives, setStrategicObjectives } = useData()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [form, setForm] = useState({ id: "", label: "", description: "" })

  function openAdd() {
    setForm({ id: `SO${strategicObjectives.length + 1}`, label: "", description: "" })
    setEditIndex(null)
    setDialogOpen(true)
  }

  function openEdit(index: number) {
    const obj = strategicObjectives[index]
    setForm({ id: obj.id, label: obj.label, description: obj.description })
    setEditIndex(index)
    setDialogOpen(true)
  }

  function handleSave() {
    if (!form.label.trim() || !form.description.trim()) {
      toast.error("Both label and description are required.")
      return
    }
    const obj: StrategicObjective = {
      id: form.id,
      label: form.label.trim(),
      description: form.description.trim(),
    }
    if (editIndex !== null) {
      const updated = [...strategicObjectives]
      updated[editIndex] = obj
      setStrategicObjectives(updated)
      toast.success("Strategic objective updated.")
    } else {
      setStrategicObjectives([...strategicObjectives, obj])
      toast.success("Strategic objective added.")
    }
    setDialogOpen(false)
  }

  function handleDelete(index: number) {
    setStrategicObjectives(strategicObjectives.filter((_, i) => i !== index))
    toast.success("Strategic objective removed.")
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Strategic Objectives</h2>
          <p className="text-sm text-muted-foreground">SSoc strategic objectives referenced by projects.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openAdd}>
          <Plus className="size-4" /> Add Objective
        </Button>
      </div>

      <div className="grid gap-3">
        {strategicObjectives.map((obj, i) => (
          <Card key={obj.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-mono">{obj.id}</Badge>
                  <span className="font-medium text-sm">{obj.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{obj.description}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(i)}>
                  <Pencil className="size-3.5" />
                  <span className="sr-only">Edit</span>
                </Button>
                <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive" onClick={() => handleDelete(i)}>
                  <Trash2 className="size-3.5" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editIndex !== null ? "Edit" : "Add"} Strategic Objective</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="so-id">ID</Label>
              <Input id="so-id" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="SO6" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="so-label">Label</Label>
              <Input id="so-label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="SO6: Innovation" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="so-desc">Description</Label>
              <Textarea id="so-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the objective..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ── Checklist Template ──────────────────────────────────── */
function ChecklistConfig() {
  const { checklistTemplate, setChecklistTemplate } = useData()
  const [addSectionOpen, setAddSectionOpen] = useState(false)
  const [newSectionName, setNewSectionName] = useState("")
  const [addItemSection, setAddItemSection] = useState<string | null>(null)
  const [newItemText, setNewItemText] = useState("")
  const [editSectionIndex, setEditSectionIndex] = useState<number | null>(null)
  const [editSectionName, setEditSectionName] = useState("")

  function handleAddSection() {
    const name = newSectionName.trim()
    if (!name) return
    if (checklistTemplate.some((s) => s.section === name)) {
      toast.error("Section already exists.")
      return
    }
    setChecklistTemplate([...checklistTemplate, { section: name, items: [] }])
    setNewSectionName("")
    setAddSectionOpen(false)
    toast.success(`Section "${name}" added.`)
  }

  function handleEditSection() {
    const name = editSectionName.trim()
    if (!name || editSectionIndex === null) return
    const updated = [...checklistTemplate]
    updated[editSectionIndex] = { ...updated[editSectionIndex], section: name }
    setChecklistTemplate(updated)
    setEditSectionIndex(null)
    toast.success("Section renamed.")
  }

  function handleDeleteSection(index: number) {
    setChecklistTemplate(checklistTemplate.filter((_, i) => i !== index))
    toast.success("Section removed.")
  }

  function handleAddItem() {
    const text = newItemText.trim()
    if (!text || !addItemSection) return
    const updated = checklistTemplate.map((s) =>
      s.section === addItemSection
        ? { ...s, items: [...s.items, text] }
        : s
    )
    setChecklistTemplate(updated)
    setNewItemText("")
    setAddItemSection(null)
    toast.success("Checklist item added.")
  }

  function handleDeleteItem(sectionIndex: number, itemIndex: number) {
    const updated = [...checklistTemplate]
    updated[sectionIndex] = {
      ...updated[sectionIndex],
      items: updated[sectionIndex].items.filter((_, i) => i !== itemIndex),
    }
    setChecklistTemplate(updated)
    toast.success("Checklist item removed.")
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Checklist Template</h2>
          <p className="text-sm text-muted-foreground">Standard POC review checklist used in all sessions.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setAddSectionOpen(true)}>
          <Plus className="size-4" /> Add Section
        </Button>
      </div>

      <div className="grid gap-4">
        {checklistTemplate.map((section, si) => (
          <Card key={si}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardCheck className="size-4 text-muted-foreground" />
                  {section.section}
                  <Badge variant="secondary" className="text-[10px]">{section.items.length} items</Badge>
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => { setEditSectionIndex(si); setEditSectionName(section.section) }}>
                    <Pencil className="size-3.5" />
                    <span className="sr-only">Edit section name</span>
                  </Button>
                  <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive" onClick={() => handleDeleteSection(si)}>
                    <Trash2 className="size-3.5" />
                    <span className="sr-only">Delete section</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {section.items.map((item, ii) => (
                  <div key={ii} className="flex items-center gap-2 group">
                    <ChevronRight className="size-3 text-muted-foreground shrink-0" />
                    <span className="text-sm flex-1">{item}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive transition-opacity"
                      onClick={() => handleDeleteItem(si, ii)}
                    >
                      <Trash2 className="size-3" />
                      <span className="sr-only">Delete item</span>
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1 w-fit mt-1"
                  onClick={() => { setAddItemSection(section.section); setNewItemText("") }}
                >
                  <Plus className="size-3" /> Add Item
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Section Dialog */}
      <Dialog open={addSectionOpen} onOpenChange={setAddSectionOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add Checklist Section</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <Label htmlFor="new-section">Section Name</Label>
            <Input id="new-section" value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} placeholder="e.g. Stakeholder Engagement" onKeyDown={(e) => e.key === "Enter" && handleAddSection()} />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleAddSection}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Section Dialog */}
      <Dialog open={editSectionIndex !== null} onOpenChange={(open) => { if (!open) setEditSectionIndex(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Rename Section</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <Label htmlFor="edit-section">Section Name</Label>
            <Input id="edit-section" value={editSectionName} onChange={(e) => setEditSectionName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleEditSection()} />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleEditSection}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={!!addItemSection} onOpenChange={(open) => { if (!open) setAddItemSection(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Item to {addItemSection}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <Label htmlFor="new-item">Checklist Item</Label>
            <Textarea id="new-item" value={newItemText} onChange={(e) => setNewItemText(e.target.value)} placeholder="Describe the checklist item..." rows={3} />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleAddItem}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ── Action Categories ───────────────────────────────────── */
function CategoriesConfig() {
  const { actionCategories, setActionCategories } = useData()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [form, setForm] = useState({ value: "", label: "" })

  function openAdd() {
    setForm({ value: "", label: "" })
    setEditIndex(null)
    setDialogOpen(true)
  }

  function openEdit(index: number) {
    const cat = actionCategories[index]
    setForm({ value: cat.value, label: cat.label })
    setEditIndex(index)
    setDialogOpen(true)
  }

  function handleSave() {
    if (!form.value.trim() || !form.label.trim()) {
      toast.error("Both value and label are required.")
      return
    }
    const cat: ActionCategoryItem = {
      value: form.value.trim().toUpperCase().replace(/\s+/g, "_"),
      label: form.label.trim(),
    }
    if (editIndex !== null) {
      const updated = [...actionCategories]
      updated[editIndex] = cat
      setActionCategories(updated)
      toast.success("Category updated.")
    } else {
      if (actionCategories.some((c) => c.value === cat.value)) {
        toast.error("Category value already exists.")
        return
      }
      setActionCategories([...actionCategories, cat])
      toast.success("Category added.")
    }
    setDialogOpen(false)
  }

  function handleDelete(index: number) {
    setActionCategories(actionCategories.filter((_, i) => i !== index))
    toast.success("Category removed.")
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Action Categories</h2>
          <p className="text-sm text-muted-foreground">Categories for classifying actions in the action register.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openAdd}>
          <Plus className="size-4" /> Add Category
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {actionCategories.map((cat, i) => (
          <Card key={cat.value}>
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex flex-col gap-0.5">
                <span className="font-medium text-sm">{cat.label}</span>
                <span className="text-[10px] font-mono text-muted-foreground">{cat.value}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="size-6" onClick={() => openEdit(i)}>
                  <Pencil className="size-3" />
                  <span className="sr-only">Edit</span>
                </Button>
                <Button variant="ghost" size="icon" className="size-6 text-destructive hover:text-destructive" onClick={() => handleDelete(i)}>
                  <Trash2 className="size-3" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editIndex !== null ? "Edit" : "Add"} Category</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cat-value">Value (key)</Label>
              <Input id="cat-value" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="e.g. PROCUREMENT" disabled={editIndex !== null} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cat-label">Display Label</Label>
              <Input id="cat-label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Procurement" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ── Classification Rules (editable) ─────────────────────── */
function ClassificationRulesView() {
  const { classificationThresholds, pocCadence, setClassificationThresholds, setPocCadence } = useData()
  const [editClass, setEditClass] = useState<string | null>(null)
  const [form, setForm] = useState<{
    contractValue: string
    riskComplexity: string
    reputationalRisk: string
    cadenceLabel: string
    cadenceFrequency: string
    cadenceQuarters: string
  }>({
    contractValue: "",
    riskComplexity: "LOW",
    reputationalRisk: "LOW",
    cadenceLabel: "",
    cadenceFrequency: "",
    cadenceQuarters: "",
  })

  function openEdit(cls: string) {
    const t = classificationThresholds[cls]
    const c = pocCadence[cls]
    setForm({
      contractValue: String(t.contractValue),
      riskComplexity: t.riskComplexity,
      reputationalRisk: t.reputationalRisk,
      cadenceLabel: c.label,
      cadenceFrequency: c.frequency,
      cadenceQuarters: c.quarters.join(", "),
    })
    setEditClass(cls)
  }

  function handleSave() {
    if (!editClass) return
    const contractValue = Number(form.contractValue)
    if (isNaN(contractValue) || contractValue < 0) {
      toast.error("Contract value must be a valid non-negative number.")
      return
    }
    if (!form.cadenceLabel.trim() || !form.cadenceFrequency.trim()) {
      toast.error("Cadence label and frequency are required.")
      return
    }
    const quarters = form.cadenceQuarters
      .split(",")
      .map((q) => parseInt(q.trim(), 10))
      .filter((q) => !isNaN(q) && q >= 1 && q <= 4)
    if (quarters.length === 0) {
      toast.error("At least one valid quarter (1-4) is required.")
      return
    }

    setClassificationThresholds({
      ...classificationThresholds,
      [editClass]: {
        contractValue,
        riskComplexity: form.riskComplexity,
        reputationalRisk: form.reputationalRisk,
      },
    })
    setPocCadence({
      ...pocCadence,
      [editClass]: {
        label: form.cadenceLabel.trim(),
        frequency: form.cadenceFrequency.trim(),
        quarters,
      },
    })
    toast.success(`Class ${editClass} rules updated.`)
    setEditClass(null)
  }

  const riskLevels = ["LOW", "MEDIUM", "HIGH"]

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Classification Rules</h2>
        <p className="text-sm text-muted-foreground">
          Projects are classified using the &ldquo;2 of 3&rdquo; rule based on contract value, risk/complexity, and reputational risk. Click edit to modify thresholds.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(classificationThresholds).map(([cls, thresholds]) => {
          const cadence = pocCadence[cls]
          return (
            <Card key={cls}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        cls === "A"
                          ? "bg-rag-red/10 text-rag-red border-rag-red/30"
                          : cls === "B"
                            ? "bg-rag-amber/10 text-rag-amber border-rag-amber/30"
                            : "bg-rag-green/10 text-rag-green border-rag-green/30"
                      }
                    >
                      Class {cls}
                    </Badge>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => openEdit(cls)}
                  >
                    <Pencil className="size-3.5" />
                    <span className="sr-only">Edit Class {cls} rules</span>
                  </Button>
                </div>
                <CardDescription>{cadence?.label}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Contract Value</span>
                    <span className="font-medium">
                      {thresholds.contractValue === 0 ? `< R10M` : `>= R${thresholds.contractValue}M`}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Risk/Complexity</span>
                    <span className="font-medium">{thresholds.riskComplexity}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Reputational Risk</span>
                    <span className="font-medium">{thresholds.reputationalRisk}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">POC Frequency</span>
                    <span className="font-medium text-xs">{cadence?.frequency}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-dashed">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">2 of 3 Rule:</strong> If a project meets the threshold for a given class in at least 2 out of 3 criteria
            (contract value, risk/complexity, reputational risk), it is assigned that classification.
            The highest matching classification applies (A &gt; B &gt; C).
          </p>
        </CardContent>
      </Card>

      {/* Edit Classification Dialog */}
      <Dialog open={!!editClass} onOpenChange={(open) => { if (!open) setEditClass(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Class {editClass} Rules</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cls-contract">Contract Value Threshold (R millions)</Label>
              <Input
                id="cls-contract"
                type="number"
                min={0}
                value={form.contractValue}
                onChange={(e) => setForm({ ...form, contractValue: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cls-risk">Risk/Complexity</Label>
              <Select value={form.riskComplexity} onValueChange={(v) => setForm({ ...form, riskComplexity: v })}>
                <SelectTrigger id="cls-risk">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {riskLevels.map((level) => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cls-rep">Reputational Risk</Label>
              <Select value={form.reputationalRisk} onValueChange={(v) => setForm({ ...form, reputationalRisk: v })}>
                <SelectTrigger id="cls-rep">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {riskLevels.map((level) => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex flex-col gap-2">
              <Label htmlFor="cls-cadence-label">Committee Label</Label>
              <Input
                id="cls-cadence-label"
                value={form.cadenceLabel}
                onChange={(e) => setForm({ ...form, cadenceLabel: e.target.value })}
                placeholder="e.g. Divisional Oversight Committee"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cls-cadence-freq">Frequency Description</Label>
              <Input
                id="cls-cadence-freq"
                value={form.cadenceFrequency}
                onChange={(e) => setForm({ ...form, cadenceFrequency: e.target.value })}
                placeholder="e.g. Biannual (Q2 & Q4)"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cls-cadence-q">Review Quarters (comma-separated, 1-4)</Label>
              <Input
                id="cls-cadence-q"
                value={form.cadenceQuarters}
                onChange={(e) => setForm({ ...form, cadenceQuarters: e.target.value })}
                placeholder="e.g. 2, 4"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
