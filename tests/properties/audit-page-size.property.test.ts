/**
 * Property Test: Audit log page size invariant
 *
 * Feature: paginated-data-loading
 * Property 8: Audit log page size invariant
 *
 * **Validates: Requirements 5.3**
 *
 * For any request to the audit endpoint, the number of entries returned SHALL be
 * min(50, remainingEntries) where remainingEntries is the count of entries after
 * the cursor position.
 */
import { describe, it, expect } from "vitest"
import * as fc from "fast-check"
import { paginateAuditEntries } from "@/lib/audit-pagination"
import type { AuditEntry } from "@/lib/types"

// ─── Generators ────────────────────────────────────────────────────────────────

const auditTypeArb = fc.constantFrom(
  "CLASSIFICATION_CHANGE" as const,
  "RAG_CHANGE" as const,
  "POC_DECISION" as const,
  "KDA_DECISION" as const,
  "ACTION_CHANGE" as const,
  "HEALTH_UPDATE" as const,
  "PROJECT_UPDATE" as const,
  "REVIEW_CREATED" as const,
  "RISK" as const
)

// Generate valid ISO date strings in a reasonable range
const isoDateStringArb = fc
  .integer({ min: 946684800000, max: 1924905600000 }) // 2000-01-01 to 2030-12-31
  .map((ts) => new Date(ts).toISOString())

const auditEntryArb = (projectId: string): fc.Arbitrary<AuditEntry> =>
  fc.record({
    id: fc.uuid(),
    projectId: fc.constant(projectId),
    timestamp: isoDateStringArb,
    actor: fc.string({ minLength: 1, maxLength: 30 }),
    type: auditTypeArb,
    description: fc.string({ minLength: 1, maxLength: 100 }),
    oldValue: fc.option(fc.string({ maxLength: 50 }), { nil: undefined }),
    newValue: fc.option(fc.string({ maxLength: 50 }), { nil: undefined }),
  })

/**
 * Sort entries the same way the route does: timestamp DESC, id DESC.
 */
function sortEntriesDescending(entries: AuditEntry[]): AuditEntry[] {
  return [...entries].sort((a, b) => {
    const tsCmp = b.timestamp.localeCompare(a.timestamp)
    if (tsCmp !== 0) return tsCmp
    return b.id.localeCompare(a.id)
  })
}

// ─── Property Test ─────────────────────────────────────────────────────────────

describe("Feature: paginated-data-loading | Property 8: Audit log page size invariant", () => {
  /**
   * **Validates: Requirements 5.3**
   *
   * For any dataset size and cursor position, the returned page has exactly
   * min(limit, remainingEntries) entries where remainingEntries is the count
   * of entries after the cursor position in the sorted array.
   */
  it("page size equals min(limit, remainingEntries) for any cursor position", () => {
    fc.assert(
      fc.property(
        fc.uuid().chain((projectId) =>
          fc.tuple(
            fc.constant(projectId),
            // Generate 1-200 audit entries
            fc.array(auditEntryArb(projectId), { minLength: 1, maxLength: 200 }),
            // Limit between 1 and 50 (default/max is 50)
            fc.integer({ min: 1, max: 50 }),
            // Cursor index: pick a random position to use as cursor (or -1 for no cursor)
            fc.integer({ min: -1, max: 199 })
          )
        ),
        ([projectId, rawEntries, limit, cursorIndex]) => {
          const sortedEntries = sortEntriesDescending(rawEntries)

          // Determine cursor: either undefined (first page) or a valid entry ID
          let cursor: string | undefined = undefined
          let expectedRemainingEntries: number

          if (cursorIndex < 0 || cursorIndex >= sortedEntries.length) {
            // No cursor — first page
            cursor = undefined
            expectedRemainingEntries = sortedEntries.length
          } else {
            // Use a valid cursor from sorted entries
            cursor = sortedEntries[cursorIndex].id
            // Remaining entries are those after the cursor position
            expectedRemainingEntries = sortedEntries.length - (cursorIndex + 1)
          }

          const page = paginateAuditEntries(sortedEntries, cursor, limit)

          // The page size should be min(limit, remainingEntries)
          const expectedPageSize = Math.min(limit, expectedRemainingEntries)
          expect(page.entries.length).toBe(expectedPageSize)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Validates: Requirements 5.3**
   *
   * When using the default/max limit of 50, the page size is exactly
   * min(50, remainingEntries).
   */
  it("with default limit of 50, page size equals min(50, remainingEntries)", () => {
    fc.assert(
      fc.property(
        fc.uuid().chain((projectId) =>
          fc.tuple(
            fc.constant(projectId),
            // Generate between 1 and 200 entries to test both under and over 50
            fc.array(auditEntryArb(projectId), { minLength: 1, maxLength: 200 })
          )
        ),
        ([projectId, rawEntries]) => {
          const sortedEntries = sortEntriesDescending(rawEntries)
          const defaultLimit = 50

          // First page with no cursor and default limit
          const page = paginateAuditEntries(sortedEntries, undefined, defaultLimit)

          const expectedPageSize = Math.min(defaultLimit, sortedEntries.length)
          expect(page.entries.length).toBe(expectedPageSize)
        }
      ),
      { numRuns: 100 }
    )
  })
})
