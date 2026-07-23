/**
 * Property Test: Audit log project scoping
 *
 * Feature: paginated-data-loading
 * Property 10: Audit log project scoping
 *
 * **Validates: Requirements 5.6**
 *
 * For any project ID passed to the audit endpoint, all returned audit entries
 * SHALL have a projectId field equal to the requested project ID. No entries
 * from other projects should appear.
 */
import { describe, it, expect } from "vitest"
import * as fc from "fast-check"
import { filterAndPaginateAudit } from "@/lib/audit-pagination"
import type { AuditEntry, AuditType } from "@/lib/types"

// ─── Generators ────────────────────────────────────────────────────────────────

const auditTypeArb: fc.Arbitrary<AuditType> = fc.constantFrom(
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

/**
 * Generates an audit entry with a given project ID.
 * Uses unique UUIDs for entry IDs to avoid collisions.
 */
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

// ─── Property Test ─────────────────────────────────────────────────────────────

describe("Feature: paginated-data-loading | Property 10: Audit log project scoping", () => {
  /**
   * **Validates: Requirements 5.6**
   *
   * For any mix of audit entries across multiple projects, when queried for a
   * specific projectId, ALL returned entries must have that projectId. No entries
   * from other projects should appear in the result.
   */
  it("all returned audit entries SHALL have projectId equal to the requested project ID", () => {
    fc.assert(
      fc.property(
        // Generate 2-5 distinct project IDs to simulate a multi-project database
        fc
          .uniqueArray(fc.uuid(), { minLength: 2, maxLength: 5 })
          .chain((projectIds) => {
            const targetProjectId = projectIds[0]
            const otherProjectIds = projectIds.slice(1)

            return fc.tuple(
              fc.constant(targetProjectId),
              // Audit entries for the target project (0-20 entries)
              fc.array(auditEntryArb(targetProjectId), { minLength: 0, maxLength: 20 }),
              // Audit entries for other projects (1-15 entries each)
              fc.tuple(
                ...otherProjectIds.map((pid) =>
                  fc.array(auditEntryArb(pid), { minLength: 1, maxLength: 15 })
                )
              ),
              // Cursor: sometimes undefined (first page), sometimes a valid entry ID
              fc.boolean(),
              // Limit: between 1 and 50
              fc.integer({ min: 1, max: 50 })
            )
          }),
        (data) => {
          const [targetProjectId, targetEntries, otherEntriesArrays, useCursor, limit] = data

          // Combine all entries into a single "database" array
          const allEntries: AuditEntry[] = [
            ...targetEntries,
            ...(otherEntriesArrays as AuditEntry[][]).flat(),
          ]

          // Determine cursor: if useCursor is true and target has entries, use the first entry's ID
          let cursor: string | undefined = undefined
          if (useCursor && targetEntries.length > 1) {
            // Sort target entries the same way the function will, pick one from the middle
            const sorted = [...targetEntries].sort((a, b) => {
              const tsCmp = b.timestamp.localeCompare(a.timestamp)
              if (tsCmp !== 0) return tsCmp
              return b.id.localeCompare(a.id)
            })
            // Use the first entry as cursor (simulates "give me page 2")
            cursor = sorted[0].id
          }

          // Execute the function under test
          const result = filterAndPaginateAudit(allEntries, targetProjectId, cursor, limit)

          // ─── Core Property: Every returned entry belongs to the target project ───
          for (const entry of result.entries) {
            expect(entry.projectId).toBe(targetProjectId)
          }

          // ─── Secondary check: no entries from other projects leaked through ───
          const otherProjectIds = new Set(
            (otherEntriesArrays as AuditEntry[][]).flat().map((e) => e.projectId)
          )
          for (const entry of result.entries) {
            expect(otherProjectIds.has(entry.projectId)).toBe(false)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
