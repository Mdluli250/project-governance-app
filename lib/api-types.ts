// API Response Type Definitions for Paginated Data Loading

import type {
  Classification,
  RAGDimensions,
  RAGStatus,
  Project,
  Action,
  POCReview,
  RiskIssue,
  KDADecision,
  AuditEntry,
  CommitteeType,
  SessionStatus,
} from "./types"

// Re-export commonly used types for convenience
export type {
  Classification,
  RAGDimensions,
  RAGStatus,
  Project,
  Action,
  POCReview,
  RiskIssue,
  KDADecision,
  AuditEntry,
  CommitteeType,
  SessionStatus,
}

// --- Dashboard Summary ---

export interface DashboardSummaryResponse {
  classificationCounts: { A: number; B: number; C: number }
  ragDistribution: {
    overall: { RED: number; AMBER: number; GREEN: number }
  }
  overdueActionCount: number
  upcomingReviews: Array<{
    projectId: string
    projectShortTitle: string
    reviewDate: string
  }>
  totalProjects: number
}

// --- Portfolio ---

export interface PortfolioProject {
  id: string
  shortTitle: string
  longTitle: string
  classification: Classification
  cluster: string
  impactArea: string
  pmId: string
  pm: { name: string; email: string }
  sponsorName: string
  strategicObjectives: string[]
  contractValue: number
  rag: RAGDimensions
  lastUpdated: string
}

export interface PortfolioResponse {
  projects: PortfolioProject[]
  actionSummaries: Record<string, { open: number; overdue: number }>
  reviewSummaries: Record<string, { nextReviewDate: string | null }>
}

// --- Project Detail ---

export interface ProjectDetailResponse {
  project: Project
  actions: Action[]
  reviews: POCReview[]
  risks: RiskIssue[]
  kdaDecisions: KDADecision[]
}

// --- Sessions ---

export interface SessionListItem {
  id: string
  date: string
  committeeType: CommitteeType
  projectIds: string[]
  projectTitles: Record<string, string> // projectId -> shortTitle
  status: SessionStatus
  attendees: string[]
}

export interface SessionsListResponse {
  sessions: SessionListItem[]
}

export interface SessionDetailResponse {
  session: SessionListItem
  projectSummaries: Array<{
    id: string
    shortTitle: string
    classification: Classification
    ragOverall: RAGStatus
  }>
}

// --- Audit Log (Cursor-Based Pagination) ---

export interface AuditQueryParams {
  cursor?: string // opaque cursor (audit entry ID)
  limit?: number // defaults to 50, max 50
}

export interface AuditPageResponse {
  entries: AuditEntry[]
  nextCursor: string | null
  hasMore: boolean
}

// --- Error ---

export interface ErrorResponse {
  error: string
}
