"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { toast } from "sonner"
import type { ChecklistItem } from "@/lib/types"
import type { ChecklistItemPayload, SessionChecklistResponse } from "@/lib/checklist-persistence-types"
import { mergeChecklistWithTemplate } from "@/lib/checklist-merge"
import { getAuthHeaders } from "@/lib/auth-token"
import { useData } from "@/lib/store"

export interface UseChecklistPersistenceOptions {
  sessionId: string
  projectId: string
  enabled: boolean // false for read-only users
}

export interface UseChecklistPersistenceReturn {
  initialState: ChecklistItem[] | null // null = loading
  save: (items: ChecklistItem[]) => void // debounced
  isSaving: boolean
  error: string | null
  conflict: boolean
  reload: () => Promise<void>
}

const DEBOUNCE_MS = 1500
const MAX_RETRIES = 3
const BACKOFF_BASE_MS = 1000 // 1s, 2s, 4s

function toPayload(items: ChecklistItem[]): ChecklistItemPayload[] {
  return items.map((item) => ({
    section: item.section,
    item: item.item,
    response: item.response,
    comment: item.comment,
    evidenceLinks: item.evidenceLinks,
    actionRequired: item.actionRequired,
  }))
}

export function useChecklistPersistence(
  options: UseChecklistPersistenceOptions
): UseChecklistPersistenceReturn {
  const { sessionId, projectId, enabled } = options
  const { checklistTemplate } = useData()

  const [initialState, setInitialState] = useState<ChecklistItem[] | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)

  // Track the last known updatedAt from server
  const updatedAtRef = useRef<string | null>(null)
  // Debounce timer ref
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track if save is disabled (e.g. 403)
  const saveDisabledRef = useRef(false)
  // Track if component is mounted
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/session-checklist?sessionId=${encodeURIComponent(sessionId)}&projectId=${encodeURIComponent(projectId)}`,
        { headers: { ...getAuthHeaders() } }
      )

      if (!res.ok) {
        if (res.status === 404) {
          setError("This session-project combination is invalid.")
          setInitialState([])
          return
        }
        throw new Error(`Failed to load checklist: ${res.status}`)
      }

      const data: SessionChecklistResponse = await res.json()
      updatedAtRef.current = data.updatedAt

      // Merge saved state with current template
      const merged = mergeChecklistWithTemplate(
        data.items,
        checklistTemplate,
        projectId
      )

      if (mountedRef.current) {
        setInitialState(merged)
        setError(null)
        setConflict(false)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load checklist")
        setInitialState([])
      }
    }
  }, [sessionId, projectId, checklistTemplate])

  // Fetch on mount (only when template is loaded)
  useEffect(() => {
    if (checklistTemplate.length === 0) return
    fetchState()
  }, [fetchState, checklistTemplate])

  const executeSave = useCallback(
    async (items: ChecklistItem[], attempt = 1): Promise<void> => {
      if (saveDisabledRef.current) return

      try {
        const res = await fetch("/api/session-checklist", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            sessionId,
            projectId,
            items: toPayload(items),
            updatedAt: updatedAtRef.current,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          updatedAtRef.current = data.updatedAt
          if (mountedRef.current) {
            setError(null)
            setIsSaving(false)
          }
          return
        }

        if (res.status === 409) {
          // Conflict — don't retry
          if (mountedRef.current) {
            setConflict(true)
            setError("Another user updated this checklist. Click Reload to see the latest version.")
            setIsSaving(false)
          }
          return
        }

        if (res.status === 403) {
          // Forbidden — disable save permanently
          saveDisabledRef.current = true
          const data = await res.json().catch(() => ({}))
          if (mountedRef.current) {
            setError(data.message || "You do not have permission to save checklist changes.")
            setIsSaving(false)
          }
          return
        }

        // Other errors — retry with backoff
        throw new Error(`Server error: ${res.status}`)
      } catch (err) {
        if (attempt < MAX_RETRIES) {
          const delay = BACKOFF_BASE_MS * Math.pow(2, attempt - 1)
          await new Promise((resolve) => setTimeout(resolve, delay))
          return executeSave(items, attempt + 1)
        }

        // All retries exhausted
        if (mountedRef.current) {
          setIsSaving(false)
          setError("Failed to save checklist. Your changes may be lost.")
          toast.error("Failed to save checklist. Your changes may be lost.")
        }
      }
    },
    [sessionId, projectId]
  )

  const save = useCallback(
    (items: ChecklistItem[]) => {
      if (!enabled || saveDisabledRef.current) return

      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // Set debounce timer
      debounceTimerRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setIsSaving(true)
          setError(null)
        }
        executeSave(items)
      }, DEBOUNCE_MS)
    },
    [enabled, executeSave]
  )

  const reload = useCallback(async () => {
    setConflict(false)
    setError(null)
    setInitialState(null) // Show loading state
    await fetchState()
  }, [fetchState])

  return {
    initialState,
    save,
    isSaving,
    error,
    conflict,
    reload,
  }
}
