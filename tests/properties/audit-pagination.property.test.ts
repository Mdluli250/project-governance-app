/**
 * Property Test: Audit log ordering and cursor continuation
 *
 * Feature: paginated-data-loading
 * Property 7: Audit log ordering and cursor continuation
 *
 * **Validates: Requirements 5.1, 5.2**
 *
 * For any set of audit entries belonging to a project, fetching pages sequentially
 * using cursors SHALL return all entries in strictly descending timestamp order,
 * with no entry appearing in more than one page and no entry missing from the
 * complete sequence.
 */
import { describe, it, expect } from "vitest"
import * as fc from "fast-check"
import { paginateAuditEntries } from "@/lib/audit-pagination"
import type { AuditEntry } from "@/lib/types"

// ─── Generators ────────────────────────────────────────────────────────────────

const auditTypeArb = fc.constantFrom(
  "CREATE" as const,
  "UPDATE" as const,
  "STATUS_CHANGE" as const,
  "RAG_CHANGE" as const,
  "REVIEW" as const,
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
 * This simulates the database ORDER BY clause.
 */
function sortEntriesDescending(entries: AuditEntry[]): AuditEntry[] {
  return [...entries].sort((a, b) => {
    const tsCmp = b.timestamp.localeCompare(a.timestamp)
    if (tsCmp !== 0) return tsCmp
    return b.id.localeCompare(a.id)
  })
}

// ─── Property Test ─────────────────────────────────────────────────────────────

describe("Feature: paginated-data-loading | Property 7: Audit log ordering and cursor continuation", () => {
  /**
   * **Validates: Requirements 5.1, 5.2**
   */
  it("sequential page fetching returns all entries in strictly descending timestamp order with no duplicates or missing entries", () => {
    fc.assert(
      fc.property(
        fc.uuid().chain((projectId) =>
          fc.tuple(
            fc.constant(projectId),
            // Generate 1-150 audit entries for the project
            fc.array(auditEntryArb(projectId), { minLength: 1, maxLength: 150 }),
            // Generate a page size between 1 and 50
            fc.integer({ min: 1, max: 50 })
          )
        ),
        ([projectId, rawEntries, pageSize]) => {
          // Pre-sort entries as the database would
          const sortedEntries = sortEntriesDescending(rawEntries)

          // Sequentially fetch all pages using cursor continuation
          const allFetchedEntries: AuditEntry[] = []
          let cursor: string | undefined = undefined
          let pageCount = 0
          const maxPages = Math.ceil(sortedEntries.length / pageSize) + 2 // safety bound

          while (pageCount < maxPages) {
            const page = paginateAuditEntries(sortedEntries, cursor, pageSize)
            allFetchedEntries.push(...page.entries)

            if (!page.hasMore) {
              break
            }

            cursor = page.nextCursor!
            pageCount++
          }

          // ─── Assertion 1: All entries are returned (no missing entries) ───
          expect(allFetchedEntries.length).toBe(sortedEntries.length)

          // ─── Assertion 2: No duplicates across pages ───
          const ids = allFetchedEntries.map((e) => e.id)
          const uniqueIds = new Set(ids)
          expect(uniqueIds.size).toBe(allFetchedEntries.length)

          // ─── Assertion 3: Strictly descending timestamp order across all pages ───
          for (let i = 1; i < allFetchedEntries.length; i++) {
            const prev = allFetchedEntries[i - 1]
            const curr = allFetchedEntries[i]
            const tsCmp = prev.timestamp.localeCompare(curr.timestamp)
            // Timestamp must be >= (descending), with id as tiebreaker
            if (tsCmp === 0) {
              // Same timestamp: id must be strictly descending
              expect(prev.id.localeCompare(curr.id)).toBeGreaterThan(0)
            } else {
              // Timestamp must be strictly greater for prev
              expect(tsCmp).toBeGreaterThan(0)
            }
          }

          // ─── Assertion 4: Fetched entries match the expected sorted order ───
          expect(allFetchedEntries).toEqual(sortedEntries)
        }
      ),
      { numRuns: 100 }
    )
  })
})
