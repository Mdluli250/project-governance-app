/**
 * Property 6: Session response shape correctness
 *
 * **Validates: Requirements 4.1, 4.2**
 *
 * For any set of sessions with associated projects, the sessions list response
 * SHALL include all session fields (id, date, committeeType, projectIds, status, attendees)
 * and project short titles for each associated project, but SHALL NOT include full project
 * detail fields (rag, contractValue, actions, reviews, etc.).
 *
 * Feature: paginated-data-loading
 * Property 6: Session response shape correctness
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  mapSessionsToListItems,
  type RawSessionWithProjects,
} from '@/app/api/sessions/route'

// ─── Generators ────────────────────────────────────────────────────────────────

const committeeTypeArb = fc.constantFrom('DIVISIONAL', 'CLUSTER', 'IMPACT_AREA')
const sessionStatusArb = fc.constantFrom('DRAFT', 'IN_PROGRESS', 'COMPLETED')

/** Generates a list of attendees */
const attendeesArb = fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
  minLength: 0,
  maxLength: 8,
})

/** Generates a session date - use integer timestamp to ensure valid dates */
const sessionDateArb = fc.integer({
  min: new Date('2020-01-01').getTime(),
  max: new Date('2030-12-31').getTime(),
}).map((ts) => new Date(ts))

/** Generates session project relations (list of projectIds) */
const sessionProjectsArb = fc.array(
  fc.record({ projectId: fc.uuid() }),
  { minLength: 0, maxLength: 6 }
)

/** Generates optional full project detail fields that should NOT appear in output */
const fullProjectDetailFieldsArb = fc.record({
  rag: fc.oneof(
    fc.constant(undefined),
    fc.record({ overall: fc.constantFrom('RED', 'AMBER', 'GREEN') })
  ),
  contractValue: fc.oneof(
    fc.constant(undefined),
    fc.float({ min: 0, max: 1_000_000, noNaN: true })
  ),
  actions: fc.oneof(
    fc.constant(undefined),
    fc.array(fc.record({ id: fc.uuid(), description: fc.string() }), { minLength: 0, maxLength: 3 })
  ),
  reviews: fc.oneof(
    fc.constant(undefined),
    fc.array(fc.record({ id: fc.uuid(), outcome: fc.string() }), { minLength: 0, maxLength: 3 })
  ),
  risks: fc.oneof(
    fc.constant(undefined),
    fc.array(fc.record({ id: fc.uuid(), title: fc.string() }), { minLength: 0, maxLength: 3 })
  ),
  auditLog: fc.oneof(
    fc.constant(undefined),
    fc.array(fc.record({ id: fc.uuid(), description: fc.string() }), { minLength: 0, maxLength: 3 })
  ),
  kdaDecisions: fc.oneof(
    fc.constant(undefined),
    fc.array(fc.record({ id: fc.uuid(), decision: fc.string() }), { minLength: 0, maxLength: 3 })
  ),
})

/** Generates a raw session record with sessionProjects and optional detail fields */
const rawSessionArb: fc.Arbitrary<RawSessionWithProjects> = fc
  .tuple(
    fc.record({
      id: fc.uuid(),
      date: sessionDateArb,
      committeeType: committeeTypeArb,
      status: sessionStatusArb,
      attendees: attendeesArb,
      sessionProjects: sessionProjectsArb,
    }),
    fullProjectDetailFieldsArb,
  )
  .map(([session, detailFields]) => ({
    ...session,
    ...detailFields,
  }))

/** Generates a set of sessions along with a matching project title map */
const sessionsWithTitleMapArb = fc
  .array(rawSessionArb, { minLength: 0, maxLength: 10 })
  .chain((sessions) => {
    // Collect all project IDs from all sessions
    const allProjectIds = new Set<string>()
    for (const session of sessions) {
      for (const sp of session.sessionProjects) {
        allProjectIds.add(sp.projectId)
      }
    }

    // Generate a title for each projectId
    const titleEntries = Array.from(allProjectIds).map((pid) =>
      fc.string({ minLength: 1, maxLength: 30 }).map((title) => [pid, title] as [string, string])
    )

    if (titleEntries.length === 0) {
      return fc.constant({ sessions, projectTitleMap: {} as Record<string, string> })
    }

    return fc.tuple(...(titleEntries as [typeof titleEntries[0], ...typeof titleEntries])).map((entries) => ({
      sessions,
      projectTitleMap: Object.fromEntries(entries),
    }))
  })

// ─── Property Tests ────────────────────────────────────────────────────────────

describe('Property 6: Session response shape correctness', () => {
  it('should include all session fields (id, date, committeeType, projectIds, status, attendees) in each item', () => {
    fc.assert(
      fc.property(sessionsWithTitleMapArb, ({ sessions, projectTitleMap }) => {
        const result = mapSessionsToListItems(sessions, projectTitleMap)

        expect(result).toHaveLength(sessions.length)

        for (let i = 0; i < sessions.length; i++) {
          const item = result[i]
          const raw = sessions[i]

          // id must match
          expect(item.id).toBe(raw.id)

          // date must be a YYYY-MM-DD string derived from raw date
          expect(item.date).toBe(raw.date.toISOString().split('T')[0])

          // committeeType must match
          expect(item.committeeType).toBe(raw.committeeType)

          // projectIds must match the sessionProjects relation
          const expectedProjectIds = raw.sessionProjects.map((sp) => sp.projectId)
          expect(item.projectIds).toEqual(expectedProjectIds)

          // status must match
          expect(item.status).toBe(raw.status)

          // attendees must match
          expect(item.attendees).toEqual(raw.attendees)
        }
      }),
      { numRuns: 100 },
    )
  })

  it('should include project short titles for each associated project', () => {
    fc.assert(
      fc.property(sessionsWithTitleMapArb, ({ sessions, projectTitleMap }) => {
        const result = mapSessionsToListItems(sessions, projectTitleMap)

        for (let i = 0; i < sessions.length; i++) {
          const item = result[i]
          const raw = sessions[i]

          // projectTitles should contain an entry for each projectId that exists in the map
          for (const sp of raw.sessionProjects) {
            if (projectTitleMap[sp.projectId]) {
              expect(item.projectTitles[sp.projectId]).toBe(projectTitleMap[sp.projectId])
            }
          }
        }
      }),
      { numRuns: 100 },
    )
  })

  it('should NOT include full project detail fields (rag, contractValue, actions, reviews, risks, auditLog, kdaDecisions)', () => {
    fc.assert(
      fc.property(sessionsWithTitleMapArb, ({ sessions, projectTitleMap }) => {
        const result = mapSessionsToListItems(sessions, projectTitleMap)

        for (const item of result) {
          const keys = Object.keys(item)
          expect(keys).not.toContain('rag')
          expect(keys).not.toContain('contractValue')
          expect(keys).not.toContain('actions')
          expect(keys).not.toContain('reviews')
          expect(keys).not.toContain('risks')
          expect(keys).not.toContain('auditLog')
          expect(keys).not.toContain('kdaDecisions')
        }
      }),
      { numRuns: 100 },
    )
  })

  it('should produce items with exactly the expected SessionListItem keys', () => {
    const expectedKeys = new Set([
      'id',
      'date',
      'committeeType',
      'projectIds',
      'projectTitles',
      'status',
      'attendees',
    ])

    fc.assert(
      fc.property(sessionsWithTitleMapArb, ({ sessions, projectTitleMap }) => {
        // Only test non-empty session lists
        fc.pre(sessions.length > 0)

        const result = mapSessionsToListItems(sessions, projectTitleMap)

        for (const item of result) {
          const resultKeys = new Set(Object.keys(item))
          expect(resultKeys).toEqual(expectedKeys)
        }
      }),
      { numRuns: 100 },
    )
  })
})
