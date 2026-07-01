import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { mapProject } from '@/lib/prisma-mappers'
import type { ProjectRow } from '@/lib/prisma-mappers'

/**
 * Feature: prisma-migration, Property 2: Project mapping preserves all data with correct type conversions
 * Validates: Requirements 9.1, 9.2, 9.4
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Mock Decimal that mimics Prisma's Decimal with a toNumber() method */
function mockDecimal(value: number) {
  return {
    toNumber: () => value,
    toString: () => value.toString(),
    // Prisma Decimal has additional methods; we only need toNumber for mapping
  }
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const ragStatusArb = fc.constantFrom('RED' as const, 'AMBER' as const, 'GREEN' as const)

const classificationArb = fc.constantFrom('A' as const, 'B' as const, 'C' as const)

const riskComplexityArb = fc.constantFrom('LOW' as const, 'MEDIUM' as const, 'HIGH' as const)

const nullableRiskComplexityArb = fc.oneof(riskComplexityArb, fc.constant(null))

const decimalArb = fc.double({ min: 0, max: 999999999999.99, noNaN: true, noDefaultInfinity: true })

const nullableDateArb = fc.oneof(
  fc.date({ min: new Date('2000-01-01T00:00:00.000Z'), max: new Date('2100-01-01T00:00:00.000Z'), noInvalidDate: true }),
  fc.constant(null)
)

const projectRowArb: fc.Arbitrary<ProjectRow> = fc.record({
  id: fc.uuid(),
  shortTitle: fc.string({ minLength: 1, maxLength: 50 }),
  longTitle: fc.string({ minLength: 1, maxLength: 200 }),
  classification: classificationArb,
  cluster: fc.string({ minLength: 1, maxLength: 30 }),
  impactArea: fc.string({ minLength: 1, maxLength: 30 }),
  pmId: fc.uuid(),
  sponsorName: fc.string({ minLength: 1, maxLength: 50 }),
  strategicObjectives: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 5 }),
  contractValue: decimalArb.map(mockDecimal) as any,
  contractTerm: fc.integer({ min: 0, max: 120 }),
  startDate: nullableDateArb,
  endDate: nullableDateArb,
  thisYearAmount: decimalArb.map(mockDecimal) as any,
  riskComplexity: nullableRiskComplexityArb,
  reputationalRisk: nullableRiskComplexityArb,
  ragOverall: ragStatusArb,
  ragScope: ragStatusArb,
  ragSchedule: ragStatusArb,
  ragCost: ragStatusArb,
  ragQuality: ragStatusArb,
  ragRisk: ragStatusArb,
  ragSheq: ragStatusArb,
  ragData: ragStatusArb,
  ragCompliance: ragStatusArb,
  healthNarrative: fc.string({ maxLength: 500 }),
  lastUpdated: nullableDateArb,
  createdAt: fc.date({ min: new Date('2000-01-01T00:00:00.000Z'), max: new Date('2100-01-01T00:00:00.000Z'), noInvalidDate: true }),
})

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: prisma-migration, Property 2: Project mapping preserves all data with correct type conversions', () => {
  it('Decimal fields are converted to numbers via .toNumber()', () => {
    fc.assert(
      fc.property(projectRowArb, (row) => {
        const result = mapProject(row)

        // contractValue should equal the numeric value from the Decimal mock
        expect(result.contractValue).toBe(row.contractValue.toNumber())
        expect(typeof result.contractValue).toBe('number')

        // thisYearAmount should equal the numeric value from the Decimal mock
        expect(result.thisYearAmount).toBe(row.thisYearAmount.toNumber())
        expect(typeof result.thisYearAmount).toBe('number')
      }),
      { numRuns: 100 }
    )
  })

  it('RAG flat fields are grouped into a nested rag object with correct keys', () => {
    fc.assert(
      fc.property(projectRowArb, (row) => {
        const result = mapProject(row)

        // rag object exists and contains all expected dimensions
        expect(result.rag).toBeDefined()
        expect(result.rag.overall).toBe(row.ragOverall)
        expect(result.rag.scope).toBe(row.ragScope)
        expect(result.rag.schedule).toBe(row.ragSchedule)
        expect(result.rag.cost).toBe(row.ragCost)
        expect(result.rag.quality).toBe(row.ragQuality)
        expect(result.rag.risk).toBe(row.ragRisk)
        expect(result.rag.sheq).toBe(row.ragSheq)
        expect(result.rag.data).toBe(row.ragData)
        expect(result.rag.compliance).toBe(row.ragCompliance)
      }),
      { numRuns: 100 }
    )
  })

  it('null dates are converted to empty strings, non-null dates to ISO strings', () => {
    fc.assert(
      fc.property(projectRowArb, (row) => {
        const result = mapProject(row)

        // startDate
        if (row.startDate === null) {
          expect(result.startDate).toBe('')
        } else {
          expect(result.startDate).toBe(row.startDate.toISOString())
        }

        // endDate
        if (row.endDate === null) {
          expect(result.endDate).toBe('')
        } else {
          expect(result.endDate).toBe(row.endDate.toISOString())
        }

        // lastUpdated
        if (row.lastUpdated === null) {
          expect(result.lastUpdated).toBe('')
        } else {
          expect(result.lastUpdated).toBe(row.lastUpdated.toISOString())
        }
      }),
      { numRuns: 100 }
    )
  })

  it('all other fields are preserved correctly', () => {
    fc.assert(
      fc.property(projectRowArb, (row) => {
        const result = mapProject(row)

        // String fields preserved as-is
        expect(result.id).toBe(row.id)
        expect(result.shortTitle).toBe(row.shortTitle)
        expect(result.longTitle).toBe(row.longTitle)
        expect(result.classification).toBe(row.classification)
        expect(result.cluster).toBe(row.cluster)
        expect(result.impactArea).toBe(row.impactArea)
        expect(result.pmId).toBe(row.pmId)
        expect(result.sponsorName).toBe(row.sponsorName)
        expect(result.strategicObjectives).toEqual(row.strategicObjectives)
        expect(result.contractTerm).toBe(row.contractTerm)
        expect(result.healthNarrative).toBe(row.healthNarrative)

        // Nullable enums default to 'LOW' when null
        expect(result.riskComplexity).toBe(row.riskComplexity ?? 'LOW')
        expect(result.reputationalRisk).toBe(row.reputationalRisk ?? 'LOW')
      }),
      { numRuns: 100 }
    )
  })
})
