/**
 * Property 3: Portfolio projection correctness
 *
 * **Validates: Requirements 2.1, 2.2, 2.3**
 *
 * For any project record with associated PM profile and related entities
 * (actions, reviews, risks, audit logs, KDA decisions), the portfolio projection
 * SHALL include all core fields (id, shortTitle, longTitle, classification, cluster,
 * impactArea, pmId, sponsorName, strategicObjectives, contractValue, rag, lastUpdated)
 * and PM info (name, email), and SHALL NOT include actions, reviews, risks, auditLog,
 * or kdaDecisions.
 *
 * Feature: paginated-data-loading
 * Property 3: Portfolio projection correctness
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  projectToPortfolioProject,
  type RawProjectWithPm,
} from '@/app/api/portfolio/route'

// ─── Generators ────────────────────────────────────────────────────────────────

const ragStatusArb = fc.constantFrom('RED', 'AMBER', 'GREEN')
const classificationArb = fc.constantFrom('A', 'B', 'C')

/** Generates a realistic PM profile */
const pmProfileArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }),
  email: fc.emailAddress(),
})

/** Generates strategic objectives as an array of strings */
const strategicObjectivesArb = fc.array(fc.string({ minLength: 1, maxLength: 100 }), {
  minLength: 0,
  maxLength: 5,
})

/** Generates a contract value that mimics Prisma Decimal (with toNumber method) or raw number */
const contractValueArb = fc.oneof(
  // Prisma Decimal-like object
  fc.float({ min: 0, max: 1_000_000_000, noNaN: true }).map((v) => ({
    toNumber: () => v,
  })),
  // null case
  fc.constant(null),
  // raw number (e.g. already converted)
  fc.float({ min: 0, max: 1_000_000_000, noNaN: true }),
)

/** Generates a lastUpdated field as Date or null - use integer timestamp to ensure valid dates */
const lastUpdatedArb = fc.oneof(
  fc.integer({ min: new Date('2000-01-01').getTime(), max: new Date('2030-12-31').getTime() }).map((ts) => new Date(ts)),
  fc.constant(null),
)

/** Generates fake related entities to attach to the raw record */
const relatedEntitiesArb = fc.record({
  actions: fc.array(fc.record({ id: fc.uuid(), description: fc.string() }), { minLength: 0, maxLength: 5 }),
  reviews: fc.array(fc.record({ id: fc.uuid(), outcome: fc.string() }), { minLength: 0, maxLength: 3 }),
  risks: fc.array(fc.record({ id: fc.uuid(), title: fc.string() }), { minLength: 0, maxLength: 4 }),
  auditLog: fc.array(fc.record({ id: fc.uuid(), description: fc.string() }), { minLength: 0, maxLength: 10 }),
  kdaDecisions: fc.array(fc.record({ id: fc.uuid(), decision: fc.string() }), { minLength: 0, maxLength: 2 }),
})

/** Generates a full raw project record with PM and optional related entities */
const rawProjectWithPmArb: fc.Arbitrary<RawProjectWithPm> = fc
  .tuple(
    fc.record({
      id: fc.uuid(),
      shortTitle: fc.string({ minLength: 1, maxLength: 30 }),
      longTitle: fc.string({ minLength: 1, maxLength: 100 }),
      classification: classificationArb,
      cluster: fc.string({ minLength: 1, maxLength: 30 }),
      impactArea: fc.string({ minLength: 1, maxLength: 30 }),
      pmId: fc.uuid(),
      sponsorName: fc.string({ minLength: 1, maxLength: 50 }),
      strategicObjectives: strategicObjectivesArb,
      contractValue: contractValueArb,
      ragOverall: fc.oneof(ragStatusArb, fc.constant(null)),
      ragScope: fc.oneof(ragStatusArb, fc.constant(null)),
      ragSchedule: fc.oneof(ragStatusArb, fc.constant(null)),
      ragCost: fc.oneof(ragStatusArb, fc.constant(null)),
      ragQuality: fc.oneof(ragStatusArb, fc.constant(null)),
      ragRisk: fc.oneof(ragStatusArb, fc.constant(null)),
      ragSheq: fc.oneof(ragStatusArb, fc.constant(null)),
      ragData: fc.oneof(ragStatusArb, fc.constant(null)),
      ragCompliance: fc.oneof(ragStatusArb, fc.constant(null)),
      lastUpdated: lastUpdatedArb,
    }),
    pmProfileArb,
    relatedEntitiesArb,
  )
  .map(([project, pm, related]) => ({
    ...project,
    pm,
    ...related,
  }))

// ─── Property Tests ────────────────────────────────────────────────────────────

describe('Property 3: Portfolio projection correctness', () => {
  it('should include all core fields in the portfolio projection', () => {
    fc.assert(
      fc.property(rawProjectWithPmArb, (rawProject) => {
        const result = projectToPortfolioProject(rawProject)

        // Verify all core fields are present and match the input
        expect(result.id).toBe(rawProject.id)
        expect(result.shortTitle).toBe(rawProject.shortTitle)
        expect(result.longTitle).toBe(rawProject.longTitle)
        expect(result.classification).toBe(rawProject.classification)
        expect(result.cluster).toBe(rawProject.cluster)
        expect(result.impactArea).toBe(rawProject.impactArea)
        expect(result.pmId).toBe(rawProject.pmId)
        expect(result.sponsorName).toBe(rawProject.sponsorName)
        expect(result.strategicObjectives).toEqual(rawProject.strategicObjectives)

        // Contract value: should be the numeric value or 0 for null
        if (rawProject.contractValue === null) {
          expect(result.contractValue).toBe(0)
        } else if (typeof rawProject.contractValue === 'number') {
          expect(result.contractValue).toBe(rawProject.contractValue)
        } else {
          expect(result.contractValue).toBe(rawProject.contractValue.toNumber())
        }

        // RAG dimensions: should default to "GREEN" when null
        const ragKeys = ['overall', 'scope', 'schedule', 'cost', 'quality', 'risk', 'sheq', 'data', 'compliance'] as const
        for (const key of ragKeys) {
          const rawKey = `rag${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof typeof rawProject
          const expected = (rawProject[rawKey] as string | null) ?? 'GREEN'
          expect(result.rag[key]).toBe(expected)
        }

        // lastUpdated: should be ISO string or empty
        if (rawProject.lastUpdated === null) {
          expect(result.lastUpdated).toBe('')
        } else {
          expect(result.lastUpdated).toBe(rawProject.lastUpdated.toISOString())
        }
      }),
      { numRuns: 100 },
    )
  })

  it('should include PM info (name and email) in the projection', () => {
    fc.assert(
      fc.property(rawProjectWithPmArb, (rawProject) => {
        const result = projectToPortfolioProject(rawProject)

        expect(result.pm).toBeDefined()
        expect(result.pm.name).toBe(rawProject.pm.name)
        expect(result.pm.email).toBe(rawProject.pm.email)
      }),
      { numRuns: 100 },
    )
  })

  it('should NOT include actions, reviews, risks, auditLog, or kdaDecisions', () => {
    fc.assert(
      fc.property(rawProjectWithPmArb, (rawProject) => {
        const result = projectToPortfolioProject(rawProject)

        // The projected object must NOT have any related entity fields
        const resultKeys = Object.keys(result)
        expect(resultKeys).not.toContain('actions')
        expect(resultKeys).not.toContain('reviews')
        expect(resultKeys).not.toContain('risks')
        expect(resultKeys).not.toContain('auditLog')
        expect(resultKeys).not.toContain('kdaDecisions')
      }),
      { numRuns: 100 },
    )
  })

  it('should produce an object with exactly the expected PortfolioProject keys', () => {
    const expectedKeys = new Set([
      'id',
      'shortTitle',
      'longTitle',
      'classification',
      'cluster',
      'impactArea',
      'pmId',
      'pm',
      'sponsorName',
      'strategicObjectives',
      'contractValue',
      'rag',
      'lastUpdated',
    ])

    fc.assert(
      fc.property(rawProjectWithPmArb, (rawProject) => {
        const result = projectToPortfolioProject(rawProject)
        const resultKeys = new Set(Object.keys(result))

        // Result should have exactly the expected keys
        expect(resultKeys).toEqual(expectedKeys)
      }),
      { numRuns: 100 },
    )
  })
})
