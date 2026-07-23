/**
 * Pure pagination logic for audit log entries.
 *
 * Extracts the cursor-based pagination algorithm from the audit route
 * into a testable pure function. Expects entries to be pre-sorted in
 * descending timestamp order (with id as tiebreaker).
 */
import type { AuditEntry } from "./types"

export interface AuditPage {
  entries: AuditEntry[]
  nextCursor: string | null
  hasMore: boolean
}

/**
 * Given a pre-sorted array of audit entries (descending by timestamp, then id),
 * applies cursor-based pagination and returns the requested page.
 *
 * @param allEntries - Full sorted array of entries for a project (timestamp DESC, id DESC)
 * @param cursor - The ID of the last entry from the previous page (undefined for first page)
 * @param limit - Maximum entries per page
 */
export function paginateAuditEntries(
  allEntries: AuditEntry[],
  cursor: string | undefined,
  limit: number
): AuditPage {
  let startIndex = 0

  if (cursor) {
    const cursorIndex = allEntries.findIndex((e) => e.id === cursor)
    if (cursorIndex === -1) {
      // Cursor not found - return empty page
      return { entries: [], nextCursor: null, hasMore: false }
    }
    // Skip past the cursor entry itself
    startIndex = cursorIndex + 1
  }

  const slice = allEntries.slice(startIndex, startIndex + limit + 1)
  const hasMore = slice.length > limit
  const pageEntries = hasMore ? slice.slice(0, limit) : slice
  const nextCursor = hasMore ? pageEntries[pageEntries.length - 1].id : null

  return { entries: pageEntries, nextCursor, hasMore }
}

/**
 * Filters audit entries by project ID and then applies cursor-based pagination.
 *
 * This combines the two steps performed by the audit route:
 * 1. Filter all audit entries to only those belonging to the given projectId
 * 2. Sort descending by (timestamp, id) and paginate
 *
 * @param allEntries - All audit entries across all projects (unfiltered)
 * @param projectId - The project ID to scope entries to
 * @param cursor - The ID of the last entry from the previous page (undefined for first page)
 * @param limit - Maximum entries per page
 */
export function filterAndPaginateAudit(
  allEntries: AuditEntry[],
  projectId: string,
  cursor: string | undefined,
  limit: number
): AuditPage {
  // Step 1: Filter to only entries belonging to the requested project
  const projectEntries = allEntries.filter((e) => e.projectId === projectId)

  // Step 2: Sort by timestamp DESC, id DESC
  const sorted = [...projectEntries].sort((a, b) => {
    const tsCmp = b.timestamp.localeCompare(a.timestamp)
    if (tsCmp !== 0) return tsCmp
    return b.id.localeCompare(a.id)
  })

  // Step 3: Paginate
  return paginateAuditEntries(sorted, cursor, limit)
}
