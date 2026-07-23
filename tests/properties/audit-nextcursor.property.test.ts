/**
 * Audit Log nextCursor Correctness Property Test
 *
 * Feature: paginated-data-loading
 * Property 9: Audit log nextCursor correctness
 *
 * **Validates: Requirements 5.4, 5.5**
 *
 * For any audit page response, nextCursor SHALL be non-null if and only if
 * there exist more entries beyond the current page. When nextCursor is null,
 * there are no more entries to fetch.
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { paginateAuditEntries } from '@/lib/audit-pagination'
import type { AuditEntry } from '@/lib/types'

// ─── Generators ────────────────────────────────────────────────────────────────

const auditTypeArb = fc.constantFrom(
  'CREATE' as const,
  'UPDATE' as const,
  'STATUS_CHANGE' as const,
  'RAG_CHANGE' as const,
  'REVIEW' as const,
  'RISK' as const
)

const isoDateStringArb = fc
  .integer({ min: 946684800000, max: 1924905600000 })
  .map((ts) => new Date(ts).toISOString())

const auditEntryArb = (projectId: string): fc.Arbitrary<AuditEntry> =>
  fc.record({
    id: fc.uuid(),
    projectId: fc.constant(projectId),
    timestamp: isoDateStringArb,
    actor: fc.string({ minLength: 1, maxLength: 20 }),
    type: auditTypeArb,
    description: fc.string({ minLength: 1, maxLength: 50 }),
    oldValue: fc.option(fc.string({ maxLength: 30 }), { nil: undefined }),
    newValue: fc.option(fc.string({ maxLength: 30 }), { nil: undefined }),
  })

/**
 * Sort entries descending by (timestamp, id) to simulate DB ordering.
 */
function sortDescending(entries: AuditEntry[]): AuditEntry[] {
  return [...entries].sort((a, b) => {
    const tsCmp = b.timestamp.localeCompare(a.timestamp)
    if (tsCmp !== 0) return tsCmp
    return b.id.localeCompare(a.id)
  })
}

// ─── Property Tests ────────────────────────────────────────────────────────────

describe('Feature: paginated-data-loading | Property 9: Audit log nextCursor correctness', () => {
  /**
   * **Validates: Requirements 5.4, 5.5**
   *
   * nextCursor is non-null if and only if there exist more entries beyond the current page.
   */
  it('nextCursor is non-null iff more entries exist beyond the current page', () => {
    fc.assert(
      fc.property(
        fc.uuid().chain((projectId) =>
          fc.tuple(
            fc.constant(projectId),
            fc.array(auditEntryArb(projectId), { minLength: 0, maxLength: 120 }),
            fc.integer({ min: 1, max: 50 })
          )
        ),
        ([projectId, rawEntries, limit]) => {
          const sorted = sortDescending(rawEntries)
          const page = paginateAuditEntries(sorted, undefined, limit)

          const totalEntries = sorted.length
          const entriesReturnedCount = page.entries.length
          const remainingAfterPage = totalEntries - entriesReturnedCount

          if (remainingAfterPage > 0) {
            // More entries exist → nextCursor must be non-null
            expect(page.nextCursor).not.toBeNull()
            expect(page.hasMore).toBe(true)
          } else {
            // No more entries → nextCursor must be null
            expect(page.nextCursor).toBeNull()
            expect(page.hasMore).toBe(false)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Validates: Requirements 5.4**
   *
   * When nextCursor is non-null, it equals the ID of the last entry in the returned page.
   */
  it('nextCursor equals the ID of the last entry in the page when more entries exist', () => {
    fc.assert(
      fc.property(
        fc.uuid().chain((projectId) =>
          fc.tuple(
            fc.constant(projectId),
            // Ensure enough entries to guarantee hasMore=true with small limits
            fc.array(auditEntryArb(projectId), { minLength: 2, maxLength: 100 }),
            fc.integer({ min: 1, max: 20 })
          )
        ),
        ([_projectId, rawEntries, limit]) => {
          const sorted = sortDescending(rawEntries)

          // Only test when there are actually more entries than the limit
          if (sorted.length <= limit) return

          const page = paginateAuditEntries(sorted, undefined, limit)

          expect(page.hasMore).toBe(true)
          expect(page.nextCursor).not.toBeNull()
          // nextCursor should be the ID of the last entry returned in this page
          const lastReturnedEntry = page.entries[page.entries.length - 1]
          expect(page.nextCursor).toBe(lastReturnedEntry.id)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Validates: Requirements 5.5**
   *
   * When nextCursor is null, fetching with any subsequent cursor returns no additional entries.
   * We verify this by checking that once we reach a page where nextCursor is null, there are
   * truly no more entries in the dataset beyond what was already returned.
   */
  it('when nextCursor is null, no more entries remain to be fetched', () => {
    fc.assert(
      fc.property(
        fc.uuid().chain((projectId) =>
          fc.tuple(
            fc.constant(projectId),
            fc.array(auditEntryArb(projectId), { minLength: 0, maxLength: 80 }),
            fc.integer({ min: 1, max: 30 })
          )
        ),
        ([_projectId, rawEntries, limit]) => {
          const sorted = sortDescending(rawEntries)

          // Paginate through all pages until nextCursor is null
          const allCollected: AuditEntry[] = []
          let cursor: string | undefined = undefined
          let safetyCounter = 0
          const maxPages = Math.ceil(sorted.length / limit) + 2

          while (safetyCounter < maxPages) {
            safetyCounter++
            const page = paginateAuditEntries(sorted, cursor, limit)
            allCollected.push(...page.entries)

            if (page.nextCursor === null) {
              // Verify hasMore is false when nextCursor is null
              expect(page.hasMore).toBe(false)
              break
            }
            cursor = page.nextCursor
          }

          // When done (nextCursor was null), all entries should have been collected
          expect(allCollected.length).toBe(sorted.length)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Validates: Requirements 5.4, 5.5**
   *
   * For intermediate pages fetched via cursor, nextCursor correctness holds:
   * each page's nextCursor accurately reflects whether more entries follow.
   */
  it('nextCursor correctness holds for every page in a multi-page traversal', () => {
    fc.assert(
      fc.property(
        fc.uuid().chain((projectId) =>
          fc.tuple(
            fc.constant(projectId),
            fc.array(auditEntryArb(projectId), { minLength: 0, maxLength: 100 }),
            fc.integer({ min: 1, max: 15 })
          )
        ),
        ([_projectId, rawEntries, limit]) => {
          const sorted = sortDescending(rawEntries)
          let cursor: string | undefined = undefined
          let fetchedSoFar = 0
          let safetyCounter = 0
          const maxPages = Math.ceil(sorted.length / limit) + 2

          while (safetyCounter < maxPages) {
            safetyCounter++
            const page = paginateAuditEntries(sorted, cursor, limit)
            fetchedSoFar += page.entries.length

            const remainingAfterThisPage = sorted.length - fetchedSoFar

            if (remainingAfterThisPage > 0) {
              expect(page.nextCursor).not.toBeNull()
              expect(page.hasMore).toBe(true)
            } else {
              expect(page.nextCursor).toBeNull()
              expect(page.hasMore).toBe(false)
            }

            if (page.nextCursor === null) break
            cursor = page.nextCursor
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Validates: Requirements 5.4, 5.5**
   *
   * Edge case: empty entry set always has null nextCursor and hasMore=false.
   */
  it('empty entry set always produces null nextCursor and hasMore=false', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        (limit) => {
          const page = paginateAuditEntries([], undefined, limit)
          expect(page.nextCursor).toBeNull()
          expect(page.hasMore).toBe(false)
          expect(page.entries).toEqual([])
        }
      ),
      { numRuns: 100 }
    )
  })
})
