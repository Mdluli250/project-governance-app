// Checklist Persistence - Type Definitions

/**
 * Valid response values for a checklist item.
 * null indicates no response has been given yet.
 */
export type ChecklistItemResponse = "YES" | "NO" | "PARTIAL" | null

/**
 * Payload for a single checklist item sent to/from the persistence API.
 */
export interface ChecklistItemPayload {
  section: string
  item: string
  response: ChecklistItemResponse
  comment: string
  evidenceLinks: string[]
  actionRequired: boolean
}

/**
 * Response shape returned by GET /api/session-checklist.
 * Also used as the body shape for PUT requests (with sessionId/projectId added).
 */
export interface SessionChecklistResponse {
  items: ChecklistItemPayload[]
  updatedAt: string | null
}
