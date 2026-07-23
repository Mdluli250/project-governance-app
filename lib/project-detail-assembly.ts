import type {
  Project,
  Action,
  POCReview,
  RiskIssue,
  KDADecision,
} from "./types"
import type { ProjectDetailResponse } from "./api-types"

/**
 * Assembles a ProjectDetailResponse by filtering related entities
 * that belong to the given project.
 *
 * This is the pure logic extracted from the project detail route handler
 * for testability. Given a project and the full set of entities, it returns
 * only those entities whose projectId matches the target project.
 */
export function assembleProjectDetail(
  project: Project,
  allActions: Action[],
  allReviews: POCReview[],
  allRisks: RiskIssue[],
  allKdaDecisions: KDADecision[]
): ProjectDetailResponse {
  return {
    project,
    actions: allActions.filter((a) => a.projectId === project.id),
    reviews: allReviews.filter((r) => r.projectId === project.id),
    risks: allRisks.filter((r) => r.projectId === project.id),
    kdaDecisions: allKdaDecisions.filter((k) => k.projectId === project.id),
  }
}
