"use client"

import { useState, useRef, useCallback } from "react"
import { useData } from "@/lib/store"
import type { Project } from "@/lib/types"
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

interface DeleteProjectDialogProps {
  project: Project
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteProjectDialog({ project, open, onOpenChange }: DeleteProjectDialogProps) {
  const { deleteProject } = useData()
  const [isDeleting, setIsDeleting] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (abortControllerRef.current) {
      abortControllerRef.current = null
    }
  }, [])

  async function handleDelete() {
    setIsDeleting(true)

    const controller = new AbortController()
    abortControllerRef.current = controller

    // Set up 30-second timeout
    timeoutRef.current = setTimeout(() => {
      controller.abort()
    }, 30000)

    try {
      // Race the deleteProject call against the abort signal
      const success = await Promise.race([
        deleteProject(project.id),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener("abort", () => {
            reject(new DOMException("The operation timed out.", "AbortError"))
          })
        }),
      ])

      cleanup()

      if (success) {
        toast.success("Project deleted successfully.", { duration: 3000 })
        onOpenChange(false)
      } else {
        toast.error("Failed to delete project. Please try again.")
        setIsDeleting(false)
      }
    } catch (error) {
      cleanup()
      if (error instanceof DOMException && error.name === "AbortError") {
        toast.error("The delete operation timed out. Please try again.")
      } else {
        toast.error("Failed to delete project. Please try again.")
      }
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Project</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{project.shortTitle}</strong>? This action is
            permanent and cannot be undone.
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
