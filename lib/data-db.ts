// Client-side helpers to load & persist all data entities via /api/data

import type { Project, Action, POCReview, RiskIssue, AuditEntry, KDADecision, POCSession } from "./types"
import { getAuthHeaders } from "./auth-token"

export interface AllData {
  projects: Project[]
  actions: Action[]
  reviews: POCReview[]
  risks: RiskIssue[]
  auditLog: AuditEntry[]
  kdaDecisions: KDADecision[]
  sessions: POCSession[]
}

export async function loadAllData(): Promise<AllData> {
  const res = await fetch("/api/data", {
    headers: { ...getAuthHeaders() },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Failed to load data (${res.status})`)
  }
  return res.json()
}

/** Persist helper that awaits the response and returns success/failure. */
export async function persistEntity(entity: string, action: string, data: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ entity, action, data }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      console.error(`Failed to persist ${entity}/${action}:`, body)
      return false
    }
    return true
  } catch (err) {
    console.error(`Network error persisting ${entity}/${action}:`, err)
    return false
  }
}
