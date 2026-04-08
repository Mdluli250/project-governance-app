"use client"

import { useState } from "react"
import { useAuth, useData } from "@/lib/store"
import { canPerformAction } from "@/lib/rules"
import type { UserRole } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Pencil, Trash2, Users, ShieldAlert, KeyRound } from "lucide-react"
import { toast } from "sonner"

const roleLabels: Record<UserRole, string> = {
  PM: "Project Manager",
  POC_MEMBER: "POC Member",
  POC_CHAIR: "POC Chair",
  ADMIN: "Admin",
}

const roleBadgeColors: Record<UserRole, string> = {
  PM: "bg-accent/15 text-accent border-accent/30",
  POC_MEMBER: "bg-primary/15 text-primary border-primary/30",
  POC_CHAIR: "bg-rag-amber/15 text-rag-amber border-rag-amber/30",
  ADMIN: "bg-rag-green/15 text-rag-green border-rag-green/30",
}

interface UserFormState {
  name: string
  email: string
  role: UserRole
  cluster: string
  impactArea: string
}

const emptyForm: UserFormState = {
  name: "",
  email: "",
  role: "PM",
  cluster: "",
  impactArea: "",
}

export default function UsersPage() {
  const { currentUser, users, addUser, updateUser, deleteUser, resetPassword } = useAuth()
  const { clusters, impactAreas: allImpactAreas } = useData()
  const canManage = canPerformAction(currentUser, "MANAGE_CONFIG")

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [form, setForm] = useState<UserFormState>(emptyForm)

  const formImpactAreas = form.cluster ? allImpactAreas[form.cluster] ?? [] : []
  const userToDelete = deleteConfirmId ? users.find((u) => u.id === deleteConfirmId) : null

  function resetForm() {
    setForm(emptyForm)
    setEditingUserId(null)
  }

  async function handleAdd() {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required.")
      return
    }
    const created = await addUser({
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      cluster: form.cluster || undefined,
      impactArea: form.impactArea || undefined,
    })
    if (created) {
      toast.success(`User "${form.name.trim()}" added successfully.`)
    } else {
      toast.error("Failed to add user.")
    }
    resetForm()
    setAddOpen(false)
  }

  function handleDelete() {
    if (!deleteConfirmId) return
    const name = userToDelete?.name ?? "User"
    deleteUser(deleteConfirmId)
    toast.success(`"${name}" has been removed.`)
    setDeleteConfirmId(null)
  }

  function handleEdit() {
    if (!editingUserId) return
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required.")
      return
    }
    updateUser(editingUserId, {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      cluster: form.cluster || undefined,
      impactArea: form.impactArea || undefined,
    })
    toast.success(`User "${form.name.trim()}" updated successfully.`)
    resetForm()
    setEditOpen(false)
  }

  async function handleResetPassword(userId: string) {
    const user = users.find((u) => u.id === userId)
    if (!user) return
    const result = await resetPassword(userId)
    if (result.success) {
      toast.success(`Password for "${user.name}" has been reset to the default. They will be prompted to change it on next login.`)
    } else {
      toast.error(result.error || "Failed to reset password.")
    }
  }

  function openEdit(userId: string) {
    const u = users.find((usr) => usr.id === userId)
    if (!u) return
    setEditingUserId(userId)
    setForm({
      name: u.name,
      email: u.email,
      role: u.role,
      cluster: u.cluster ?? "",
      impactArea: u.impactArea ?? "",
    })
    setEditOpen(true)
  }

  if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert className="size-12 text-muted-foreground/30 mb-4" />
        <h2 className="text-lg font-semibold">Access Restricted</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Only Admins can manage users. Switch to the Admin role to access this page.
        </p>
      </div>
    )
  }

  const formFields = (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="user-name">Full Name</Label>
        <Input
          id="user-name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Dr. John Smith"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="user-email">Email</Label>
        <Input
          id="user-email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="e.g. john.smith@csir.co.za"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="user-role">Role</Label>
        <Select
          value={form.role}
          onValueChange={(v) => setForm((f) => ({ ...f, role: v as UserRole }))}
        >
          <SelectTrigger id="user-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(roleLabels) as UserRole[]).map((r) => (
              <SelectItem key={r} value={r}>
                {roleLabels[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="user-cluster">Cluster (optional)</Label>
        <Select
          value={form.cluster}
          onValueChange={(v) =>
            setForm((f) => ({ ...f, cluster: v, impactArea: "" }))
          }
        >
          <SelectTrigger id="user-cluster">
            <SelectValue placeholder="Select a cluster" />
          </SelectTrigger>
          <SelectContent>
            {clusters.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {formImpactAreas.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="user-ia">Impact Area (optional)</Label>
          <Select
            value={form.impactArea}
            onValueChange={(v) => setForm((f) => ({ ...f, impactArea: v }))}
          >
            <SelectTrigger id="user-ia">
              <SelectValue placeholder="Select an impact area" />
            </SelectTrigger>
            <SelectContent>
              {formImpactAreas.map((ia) => (
                <SelectItem key={ia} value={ia}>
                  {ia}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-balance">
            User Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage system users and their roles for the SSoc governance framework.
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="size-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            {formFields}
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleAdd}>Add User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Users className="size-4" />
            {users.length} User(s)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">Cluster</TableHead>
                  <TableHead className="hidden md:table-cell">Impact Area</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={roleBadgeColors[user.role]}>
                        {roleLabels[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {user.cluster ?? "--"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {user.impactArea ?? "--"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => openEdit(user.id)}
                          title={`Edit ${user.name}`}
                        >
                          <Pencil className="size-3.5" />
                          <span className="sr-only">Edit {user.name}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-amber-600 hover:text-amber-700"
                          onClick={() => handleResetPassword(user.id)}
                          title={`Reset password for ${user.name}`}
                        >
                          <KeyRound className="size-3.5" />
                          <span className="sr-only">Reset password for {user.name}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirmId(user.id)}
                          disabled={user.id === currentUser.id}
                          title={`Delete ${user.name}`}
                        >
                          <Trash2 className="size-3.5" />
                          <span className="sr-only">Delete {user.name}</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) resetForm() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              {"Are you sure you want to remove "}
              <strong>{userToDelete?.name}</strong>
              {` (${userToDelete?.email})?`}
              {" This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
