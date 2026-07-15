// SSoc Framework - Business Rules

import type {
  Project,
  Action,
  User,
  Classification,
  RiskComplexity,
  ReputationalRisk,
  RAGStatus,
  RAGDimensions,
} from "./types"
import { RAG_DIMENSION_KEYS } from "./types"
import { POC_CADENCE } from "./constants"

/**
 * Calculate the next POC review due date based on project classification cadence.
 * Class A: Q2 and Q4 | Class B: Q2 | Class C: Q2
 */
export function getNextPOCReviewDue(project: Project, lastReviewDate?: string): string {
  const cadence = POC_CADENCE[project.classification]
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const quarterEndMonths: Record<number, number> = { 1: 3, 2: 6, 3: 9, 4: 12 }

  for (const q of cadence.quarters) {
    const endMonth = quarterEndMonths[q]
    if (currentMonth <= endMonth) {
      const dueDate = new Date(currentYear, endMonth - 1, 28)
      if (!lastReviewDate || new Date(lastReviewDate) < dueDate) {
        return dueDate.toISOString().split("T")[0]
      }
    }
  }

  // Next year, first quarter in cadence
  const firstQ = cadence.quarters[0]
  const endMonth = quarterEndMonths[firstQ]
  return new Date(currentYear + 1, endMonth - 1, 28).toISOString().split("T")[0]
}

/**
 * Check if a project requires attention (any Red dimension, overdue review, or past-due actions)
 */
export function requiresAttention(
  project: Project,
  actions: Action[],
  lastReviewDate?: string
): { needsAttention: boolean; reasons: string[] } {
  const reasons: string[] = []

  // Check for Red RAG in any dimension
  const dimensions = RAG_DIMENSION_KEYS
  for (const dim of dimensions) {
    if (project.rag[dim] === "RED") {
      reasons.push(`${dim.charAt(0).toUpperCase() + dim.slice(1)} dimension is Red`)
    }
  }
  if (project.rag.overall === "RED") {
    reasons.push("Overall RAG is Red")
  }

  // Check for overdue review
  const nextDue = getNextPOCReviewDue(project, lastReviewDate)
  if (new Date(nextDue) < new Date()) {
    reasons.push("POC review overdue")
  }

  // Check for past-due actions
  const overdueActions = actions.filter(
    (a) => a.projectId === project.id && isOverdue(a)
  )
  if (overdueActions.length > 0) {
    reasons.push(`${overdueActions.length} overdue action(s)`)
  }

  return { needsAttention: reasons.length > 0, reasons }
}

/**
 * Derive classification using SSoc's "2 of 3" rule.
 */
export function deriveClassification(
  contractValue: number,
  riskComplexity: RiskComplexity,
  reputationalRisk: ReputationalRisk
): Classification {
  let aCount = 0
  let bCount = 0

  // Contract value check
  if (contractValue >= 50) aCount++
  else if (contractValue >= 10) bCount++

  // Risk/complexity check
  if (riskComplexity === "HIGH") aCount++
  else if (riskComplexity === "MEDIUM") bCount++

  // Reputational risk check
  if (reputationalRisk === "HIGH") aCount++
  else if (reputationalRisk === "MEDIUM") bCount++

  if (aCount >= 2) return "A"
  if (aCount + bCount >= 2 && bCount >= 1) return "B"
  return "C"
}

/**
 * Check if an action is overdue (past due date and not closed).
 */
export function isOverdue(action: Action): boolean {
  if (action.status === "CLOSED") return false
  return new Date(action.dueDate) < new Date()
}

/**
 * RBAC permission check.
 */
export function canPerformAction(
  user: User,
  action:
    | "EDIT_PROJECT"
    | "SUBMIT_REVIEW_PACK"
    | "COMPLETE_CHECKLIST"
    | "RECORD_DECISION"
    | "CREATE_ACTION"
    | "MANAGE_CONFIG"
    | "VIEW_ALL_PROJECTS"
    | "CREATE_SESSION"
    | "MANAGE_USERS"
    | "EDIT_COMPLETED_CHECKLIST"
    | "DELETE_SESSION"
): boolean {
  switch (action) {
    case "EDIT_PROJECT":
      return user.role === "PM" || user.role === "ADMIN"
    case "SUBMIT_REVIEW_PACK":
      return user.role === "PM"
    case "COMPLETE_CHECKLIST":
      return ["POC_MEMBER", "POC_CHAIR", "ADMIN"].includes(user.role)
    case "EDIT_COMPLETED_CHECKLIST":
      return user.role === "POC_CHAIR" || user.role === "ADMIN"
    case "RECORD_DECISION":
      return user.role === "POC_CHAIR" || user.role === "ADMIN"
    case "CREATE_ACTION":
      return ["POC_MEMBER", "POC_CHAIR", "ADMIN"].includes(user.role)
    case "MANAGE_CONFIG":
    case "MANAGE_USERS":
      return user.role === "ADMIN"
    case "VIEW_ALL_PROJECTS":
      return ["POC_CHAIR", "ADMIN"].includes(user.role)
    case "CREATE_SESSION":
    case "DELETE_SESSION":
      return user.role === "POC_CHAIR" || user.role === "ADMIN"
    default:
      return false
  }
}

/**
 * Derive overall RAG from dimension values using worst-of rule.
 */
export function deriveOverallRAG(rag: RAGDimensions): RAGStatus {
  const severity: Record<RAGStatus, number> = { GREEN: 0, AMBER: 1, RED: 2 }
  let worst: RAGStatus = "GREEN"
  for (const key of RAG_DIMENSION_KEYS) {
    if (severity[rag[key]] > severity[worst]) worst = rag[key]
  }
  return worst
}

/**
 * Count RAG statuses across a list of projects per dimension.
 */
export function countRAGByDimension(
  projects: Project[]
): Record<string, { RED: number; AMBER: number; GREEN: number }> {
  const result: Record<string, { RED: number; AMBER: number; GREEN: number }> = {}

  const allDims = ["overall", ...RAG_DIMENSION_KEYS] as (keyof RAGDimensions)[]
  for (const dim of allDims) {
    result[dim] = { RED: 0, AMBER: 0, GREEN: 0 }
    for (const p of projects) {
      result[dim][p.rag[dim]]++
    }
  }

  return result
}

/**
 * Get open and overdue action counts for a project.
 */
export function getActionCounts(
  projectId: string,
  actions: Action[]
): { open: number; overdue: number } {
  const projectActions = actions.filter((a) => a.projectId === projectId)
  return {
    open: projectActions.filter((a) => a.status !== "CLOSED").length,
    overdue: projectActions.filter((a) => isOverdue(a)).length,
  }
}
