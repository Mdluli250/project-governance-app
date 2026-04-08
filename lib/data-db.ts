// Client-side helpers to load & persist all data entities via /api/data

import type { Project, Action, POCReview, RiskIssue, AuditEntry, KDADecision, POCSession } from "./types"

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
  const res = await fetch("/api/data")
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Failed to load data (${res.status})`)
  }
  return res.json()
}

/** Fire-and-forget persist helper. Logs errors but doesn't throw. */
export function persistEntity(entity: string, action: string, data: Record<string, unknown>) {
  fetch("/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entity, action, data }),
  })
    .then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        console.error(`Failed to persist ${entity}/${action}:`, body)
      }
    })
    .catch((err) => {
      console.error(`Network error persisting ${entity}/${action}:`, err)
    })
}
