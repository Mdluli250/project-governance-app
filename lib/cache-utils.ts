/**
 * Pure cache utility functions for updating locally cached project detail data.
 *
 * These functions enable immediate local cache updates after mutations,
 * without requiring a full page reload or refetch.
 */

import type { ProjectDetailResponse } from "./api-types"
import type { Action, Project, RiskIssue, KDADecision, POCReview } from "./types"

/**
 * Applies an updater function to a cached project detail entry.
 * Returns a new cache Map with the updated entry; does not mutate the original.
 * If the projectId is not in the cache, returns the cache unchanged.
 */
export function updateCachedProjectDetail(
  cache: Map<string, ProjectDetailResponse>,
  projectId: string,
  updater: (detail: ProjectDetailResponse) => ProjectDetailResponse
): Map<string, ProjectDetailResponse> {
  const existing = cache.get(projectId)
  if (!existing) {
    return cache
  }
  const updated = updater(existing)
  const next = new Map(cache)
  next.set(projectId, updated)
  return next
}

/**
 * Adds or updates an action in a cached project detail entry.
 * If the action ID already exists, replaces it; otherwise appends.
 * Returns a new cache Map. Does not mutate the original.
 */
export function updateCachedAction(
  cache: Map<string, ProjectDetailResponse>,
  projectId: string,
  action: Action
): Map<string, ProjectDetailResponse> {
  return updateCachedProjectDetail(cache, projectId, (detail) => {
    const existingIndex = detail.actions.findIndex((a) => a.id === action.id)
    const newActions =
      existingIndex >= 0
        ? detail.actions.map((a, i) => (i === existingIndex ? action : a))
        : [...detail.actions, action]
    return { ...detail, actions: newActions }
  })
}

/**
 * Updates project fields in a cached project detail entry.
 * Returns a new cache Map. Does not mutate the original.
 */
export function updateCachedProjectFields(
  cache: Map<string, ProjectDetailResponse>,
  projectId: string,
  updates: Partial<Project>
): Map<string, ProjectDetailResponse> {
  return updateCachedProjectDetail(cache, projectId, (detail) => ({
    ...detail,
    project: { ...detail.project, ...updates },
  }))
}

/**
 * Adds or updates a risk in a cached project detail entry.
 * If the risk ID already exists, replaces it; otherwise appends.
 * Returns a new cache Map. Does not mutate the original.
 */
export function updateCachedRisk(
  cache: Map<string, ProjectDetailResponse>,
  projectId: string,
  risk: RiskIssue
): Map<string, ProjectDetailResponse> {
  return updateCachedProjectDetail(cache, projectId, (detail) => {
    const existingIndex = detail.risks.findIndex((r) => r.id === risk.id)
    const newRisks =
      existingIndex >= 0
        ? detail.risks.map((r, i) => (i === existingIndex ? risk : r))
        : [...detail.risks, risk]
    return { ...detail, risks: newRisks }
  })
}

/**
 * Adds or updates a KDA decision in a cached project detail entry.
 * Returns a new cache Map. Does not mutate the original.
 */
export function updateCachedKDADecision(
  cache: Map<string, ProjectDetailResponse>,
  projectId: string,
  decision: KDADecision
): Map<string, ProjectDetailResponse> {
  return updateCachedProjectDetail(cache, projectId, (detail) => {
    const existingIndex = detail.kdaDecisions.findIndex((d) => d.id === decision.id)
    const newDecisions =
      existingIndex >= 0
        ? detail.kdaDecisions.map((d, i) => (i === existingIndex ? decision : d))
        : [...detail.kdaDecisions, decision]
    return { ...detail, kdaDecisions: newDecisions }
  })
}

/**
 * Adds or updates a review in a cached project detail entry.
 * Returns a new cache Map. Does not mutate the original.
 */
export function updateCachedReview(
  cache: Map<string, ProjectDetailResponse>,
  projectId: string,
  review: POCReview
): Map<string, ProjectDetailResponse> {
  return updateCachedProjectDetail(cache, projectId, (detail) => {
    const existingIndex = detail.reviews.findIndex((r) => r.id === review.id)
    const newReviews =
      existingIndex >= 0
        ? detail.reviews.map((r, i) => (i === existingIndex ? review : r))
        : [...detail.reviews, review]
    return { ...detail, reviews: newReviews }
  })
}
