// SSoc Project Management Framework - Type Definitions

export type UserRole = "PM" | "POC_MEMBER" | "POC_CHAIR" | "ADMIN"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  cluster?: string
  impactArea?: string
  passwordChanged?: boolean
}

export type RAGStatus = "RED" | "AMBER" | "GREEN"

export type Classification = "A" | "B" | "C"

export interface RAGDimensions {
  overall: RAGStatus
  scope: RAGStatus
  schedule: RAGStatus
  cost: RAGStatus
  quality: RAGStatus
  risk: RAGStatus
  sheq: RAGStatus
  data: RAGStatus
  compliance: RAGStatus
}

export type RiskComplexity = "LOW" | "MEDIUM" | "HIGH"
export type ReputationalRisk = "LOW" | "MEDIUM" | "HIGH"

export interface Project {
  id: string
  shortTitle: string
  longTitle: string
  classification: Classification
  cluster: string
  impactArea: string
  pmId: string
  sponsorName: string
  strategicObjectives: string[]
  contractValue: number
  contractTerm: number
  startDate: string
  endDate: string
  thisYearAmount: number
  riskComplexity: RiskComplexity
  reputationalRisk: ReputationalRisk
  rag: RAGDimensions
  healthNarrative: string
  lastUpdated: string
}

export type ChecklistResponse = "YES" | "NO" | "PARTIAL"

export interface ChecklistItem {
  id: string
  section: string
  item: string
  response: ChecklistResponse | null
  comment: string
  evidenceLinks: string[]
  actionRequired: boolean
}

export type ReviewOutcome =
  | "APPROVED"
  | "APPROVED_WITH_ACTIONS"
  | "REJECTED"
  | "DEFERRED"

export type CommitteeType = "DIVISIONAL" | "CLUSTER" | "IMPACT_AREA"

export interface POCReview {
  id: string
  projectId: string
  reviewDate: string
  committeeType: CommitteeType
  attendees: string[]
  checklistResponses: ChecklistItem[]
  findingsSummary: string
  escalation: boolean
  outcome: ReviewOutcome
}

export type ActionStatus = "OPEN" | "IN_PROGRESS" | "CLOSED"

export type ActionCategory =
  | "GOVERNANCE"
  | "RISK"
  | "SHEQ"
  | "COMPLIANCE"
  | "DATA"
  | "CONTRACT"
  | "SCHEDULE"
  | "FINANCE"

export interface Action {
  id: string
  projectId: string
  reviewId?: string
  description: string
  owner: string
  dueDate: string
  status: ActionStatus
  category: ActionCategory
  evidenceLinks: string[]
}

export type GateDecision = "APPROVED" | "REJECTED" | "EXCEPTION_REQUIRED"

export interface KDADecision {
  id: string
  projectId: string
  gateName: string
  stage: string
  submissionStatus: string
  decision: GateDecision
  notes: string
  signedOffBy: string
  date: string
}

export type AuditType =
  | "CLASSIFICATION_CHANGE"
  | "RAG_CHANGE"
  | "POC_DECISION"
  | "KDA_DECISION"
  | "ACTION_CHANGE"
  | "HEALTH_UPDATE"
  | "PROJECT_UPDATE"
  | "REVIEW_CREATED"
  | "RISK"

export interface AuditEntry {
  id: string
  projectId: string
  timestamp: string
  actor: string
  type: AuditType
  description: string
  oldValue?: string
  newValue?: string
}

export type RiskIssueType = "RISK" | "ISSUE"
export type Likelihood = "LOW" | "MEDIUM" | "HIGH"
export type Impact = "LOW" | "MEDIUM" | "HIGH"

export interface RiskIssue {
  id: string
  projectId: string
  title: string
  type: RiskIssueType
  likelihood: Likelihood
  impact: Impact
  ragStatus: RAGStatus
  mitigation: string
  owner: string
  status: "OPEN" | "MITIGATED" | "CLOSED"
}

export type SessionStatus = "DRAFT" | "IN_PROGRESS" | "COMPLETED"

export interface POCSession {
  id: string
  date: string
  committeeType: CommitteeType
  projectIds: string[]
  status: SessionStatus
  attendees: string[]
}

export const RAG_DIMENSION_KEYS: (keyof Omit<RAGDimensions, "overall">)[] = [
  "scope",
  "schedule",
  "cost",
  "quality",
  "risk",
  "sheq",
  "data",
  "compliance",
]
