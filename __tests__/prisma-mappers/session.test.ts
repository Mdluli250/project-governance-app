import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { mapSession } from '@/lib/prisma-mappers'
import type { SessionRow } from '@/lib/prisma-mappers'
import type { CommitteeType, SessionStatus } from '@prisma/client'

/**
 * Feature: prisma-migration, Property 3: Session mapping extracts project IDs correctly
 * Validates: Requirements 9.1, 9.2
 */

const committeeTypes: CommitteeType[] = ['DIVISIONAL', 'CLUSTER', 'IMPACT_AREA']
const sessionStatuses: SessionStatus[] = ['DRAFT', 'IN_PROGRESS', 'COMPLETED']

/** Arbitrary for a SessionProject junction record */
function arbSessionProject(sessionId: string) {
  return fc.record({
    sessionId: fc.constant(sessionId),
    projectId: fc.uuid(),
  })
}

/** Generate a valid date (fast-check's fc.date() can produce invalid Date(NaN) even with min/max in some edge cases) */
function arbValidDate() {
  return fc.integer({ min: 946684800000, max: 4102444800000 }).map((ts) => new Date(ts))
}

/** Arbitrary for a valid Prisma PocSession record with sessionProjects */
const arbSessionRow: fc.Arbitrary<SessionRow> = fc.uuid().chain((sessionId) =>
  fc.record({
    id: fc.constant(sessionId),
    date: arbValidDate(),
    committeeType: fc.constantFrom(...committeeTypes),
    status: fc.constantFrom(...sessionStatuses),
    attendees: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 10 }),
    createdAt: arbValidDate(),
    updatedAt: arbValidDate(),
    sessionProjects: fc.array(arbSessionProject(sessionId), { minLength: 0, maxLength: 20 }),
  })
)

describe('Feature: prisma-migration, Property 3: Session mapping extracts project IDs correctly', () => {
  it('should extract projectIds from sessionProjects in order', () => {
    fc.assert(
      fc.property(arbSessionRow, (session) => {
        const result = mapSession(session)

        // projectIds should contain exactly the projectId values from sessionProjects
        const expectedProjectIds = session.sessionProjects.map((sp) => sp.projectId)
        expect(result.projectIds).toEqual(expectedProjectIds)

        // Length must match
        expect(result.projectIds.length).toBe(session.sessionProjects.length)

        // Each projectId in the output should match the corresponding junction record
        for (let i = 0; i < session.sessionProjects.length; i++) {
          expect(result.projectIds[i]).toBe(session.sessionProjects[i].projectId)
        }
      }),
      { numRuns: 200 }
    )
  })

  it('should correctly map all other session fields', () => {
    fc.assert(
      fc.property(arbSessionRow, (session) => {
        const result = mapSession(session)

        // id is preserved
        expect(result.id).toBe(session.id)

        // date is converted to ISO string
        expect(result.date).toBe(session.date.toISOString())

        // committeeType is preserved
        expect(result.committeeType).toBe(session.committeeType)

        // status is preserved
        expect(result.status).toBe(session.status)

        // attendees is preserved
        expect(result.attendees).toEqual(session.attendees)
      }),
      { numRuns: 100 }
    )
  })
})
