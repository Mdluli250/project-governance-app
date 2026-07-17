// Client-side helpers to load & persist all data entities via /api/data

import type { Project, Action, POCReview, RiskIssue, AuditEntry, KDADecision, POCSession } from "./types"
import type {
  DashboardSummaryResponse,
  PortfolioResponse,
  ProjectDetailResponse,
  SessionsListResponse,
  SessionDetailResponse,
  AuditPageResponse,
} from "./api-types"
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

/**
 * @deprecated Use per-page fetch functions instead. Kept temporarily for backwards compatibility.
 */
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

// --- Per-page fetch functions ---

/** Fetch dashboard summary (aggregate counts, RAG distribution, overdue actions, upcoming reviews). */
export async function fetchDashboardSummary(): Promise<DashboardSummaryResponse> {
  const res = await fetch("/api/dashboard", {
    headers: { ...getAuthHeaders() },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Failed to fetch dashboard summary (${res.status})`)
  }
  return res.json()
}

/** Fetch portfolio projects with PM info, action summaries, and review summaries. */
export async function fetchPortfolio(): Promise<PortfolioResponse> {
  const res = await fetch("/api/portfolio", {
    headers: { ...getAuthHeaders() },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Failed to fetch portfolio (${res.status})`)
  }
  return res.json()
}

/** Fetch a single project with all related entities (actions, reviews, risks, KDA decisions). */
export async function fetchProjectDetail(id: string): Promise<ProjectDetailResponse> {
  const res = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
    headers: { ...getAuthHeaders() },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Failed to fetch project detail (${res.status})`)
  }
  return res.json()
}

/** Fetch all sessions with project short titles. */
export async function fetchSessions(): Promise<SessionsListResponse> {
  const res = await fetch("/api/sessions", {
    headers: { ...getAuthHeaders() },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Failed to fetch sessions (${res.status})`)
  }
  return res.json()
}

/** Fetch a single session with associated project summaries. */
export async function fetchSessionDetail(id: string): Promise<SessionDetailResponse> {
  const res = await fetch(`/api/sessions/${encodeURIComponent(id)}`, {
    headers: { ...getAuthHeaders() },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Failed to fetch session detail (${res.status})`)
  }
  return res.json()
}

/** Fetch a page of audit log entries for a project using cursor-based pagination. */
export async function fetchAuditPage(projectId: string, cursor?: string): Promise<AuditPageResponse> {
  const url = new URL(`/api/projects/${encodeURIComponent(projectId)}/audit`, window.location.origin)
  if (cursor) {
    url.searchParams.set("cursor", cursor)
  }
  const res = await fetch(url.toString(), {
    headers: { ...getAuthHeaders() },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Failed to fetch audit page (${res.status})`)
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
