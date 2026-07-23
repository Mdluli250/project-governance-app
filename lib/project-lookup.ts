import type { ProjectDetailResponse, ErrorResponse } from "./api-types"

/**
 * Result type for project lookup operation.
 * Either a successful response with project data, or a 404 error.
 */
export type ProjectLookupResult =
  | { status: 200; data: ProjectDetailResponse }
  | { status: 404; data: ErrorResponse }

/**
 * Looks up a project by ID from a dataset.
 *
 * For any project ID that does not exist in the dataset, returns a 404 status
 * code with an error message. For existing IDs, returns the project detail.
 *
 * This is a pure function that encapsulates the lookup logic used by
 * the GET /api/projects/[id] route handler.
 */
export function lookupProjectById(
  id: string,
  projectsMap: Map<string, ProjectDetailResponse>
): ProjectLookupResult {
  const projectDetail = projectsMap.get(id)

  if (!projectDetail) {
    return {
      status: 404,
      data: { error: "Project not found" },
    }
  }

  return {
    status: 200,
    data: projectDetail,
  }
}
