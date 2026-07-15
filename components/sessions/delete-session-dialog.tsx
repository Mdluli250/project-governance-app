"use client"

import { useState } from "react"
import { useData } from "@/lib/store"
import { COMMITTEE_TYPE_LABELS } from "@/lib/constants"
import type { POCSession } from "@/lib/types"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

interface DeleteSessionDialogProps {
  session: POCSession
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteSessionDialog({ session, open, onOpenChange }: DeleteSessionDialogProps) {
  const { deleteSession } = useData()
  const [isDeleting, setIsDeleting] = useState(false)

  const committeeLabel = COMMITTEE_TYPE_LABELS[session.committeeType] || session.committeeType
  const formattedDate = new Date(session.date).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  async function handleDelete() {
    setIsDeleting(true)
    try {
      const success = await deleteSession(session.id)
      if (success) {
        toast.success("Session deleted successfully.")
      } else {
        toast.error("Failed to delete session. Please try again.")
      }
    } catch {
      toast.error("Failed to delete session. Please try again.")
    } finally {
      setIsDeleting(false)
      onOpenChange(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Session</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the <strong>{committeeLabel}</strong> session on{" "}
            <strong>{formattedDate}</strong>? This action is permanent and cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleDelete()
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
