/**
 * Property 1: Valid inputs pass validation
 *
 * **Validates: Requirements 1.2**
 *
 * For any form state where shortTitle is 1-100 non-whitespace characters,
 * cluster is non-empty, pmId is non-empty, longTitle is ≤ 255 characters,
 * sponsorName is ≤ 100 characters, contractValue is between 0 and 999999.9,
 * contractTerm is an integer between 0 and 600, thisYearAmount is between
 * 0 and 999999.9, healthNarrative is ≤ 2000 characters, and endDate is ≥
 * startDate (when both are set), the validation function SHALL return no errors.
 *
 * Feature: portfolio-crud-operations, Property 1: Valid inputs pass validation
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  validateEditProjectForm,
  type EditProjectFormState,
} from '@/lib/validators/edit-project-form'

// ─── Generators ────────────────────────────────────────────────────────────────

/** Generates a non-whitespace-only string of 1-100 characters for shortTitle */
const shortTitleArb = fc
  .string({ minLength: 1, maxLength: 99 })
  .map((s) => `A${s}`) // Ensure at least one non-whitespace character

/** Generates a string of 0-255 characters for longTitle */
const longTitleArb = fc.string({ minLength: 0, maxLength: 255 })

/** Generates a non-empty trimmed string for cluster */
const clusterArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .map((s) => `C${s}`) // Ensure non-whitespace content

/** Generates a non-empty trimmed string for pmId */
const pmIdArb = fc.uuid()

/** Generates a string of 0-100 characters for sponsorName */
const sponsorNameArb = fc.string({ minLength: 0, maxLength: 100 })

/** Generates a valid contract value as a string (0 to 999999.9) or empty */
const contractValueArb = fc.oneof(
  fc.constant(''),
  fc
    .integer({ min: 0, max: 9999999 })
    .map((v) => String(v / 10)),
)

/** Generates a valid contract term as a string (integer 0 to 600) or empty */
const contractTermArb = fc.oneof(
  fc.constant(''),
  fc.integer({ min: 0, max: 600 }).map(String),
)

/** Generates a valid this year amount as a string (0 to 999999.9) or empty */
const thisYearAmountArb = fc.oneof(
  fc.constant(''),
  fc
    .integer({ min: 0, max: 9999999 })
    .map((v) => String(v / 10)),
)

/** Generates a string of 0-2000 characters for healthNarrative */
const healthNarrativeArb = fc.string({ minLength: 0, maxLength: 2000 })

/** Generates valid date pairs where endDate >= startDate when both set */
const datePairArb = fc.oneof(
  // Both empty
  fc.constant({ startDate: '', endDate: '' }),
  // Only startDate set
  fc
    .integer({ min: new Date('2000-01-01').getTime(), max: new Date('2030-12-31').getTime() })
    .map((ts) => ({ startDate: new Date(ts).toISOString().split('T')[0], endDate: '' })),
  // Only endDate set
  fc
    .integer({ min: new Date('2000-01-01').getTime(), max: new Date('2030-12-31').getTime() })
    .map((ts) => ({ startDate: '', endDate: new Date(ts).toISOString().split('T')[0] })),
  // Both set with endDate >= startDate
  fc
    .tuple(
      fc.integer({ min: new Date('2000-01-01').getTime(), max: new Date('2025-12-31').getTime() }),
      fc.integer({ min: 0, max: 365 * 5 * 24 * 60 * 60 * 1000 }), // 0 to ~5 years offset
    )
    .map(([startTs, offset]) => ({
      startDate: new Date(startTs).toISOString().split('T')[0],
      endDate: new Date(startTs + offset).toISOString().split('T')[0],
    })),
)

const riskLevelArb = fc.constantFrom('LOW', 'MEDIUM', 'HIGH')
const impactAreaArb = fc.string({ minLength: 0, maxLength: 50 })
const strategicObjectivesArb = fc.array(fc.uuid(), { minLength: 0, maxLength: 5 })

/** Generates a complete valid EditProjectFormState */
const validFormStateArb: fc.Arbitrary<EditProjectFormState> = fc
  .tuple(
    fc.record({
      shortTitle: shortTitleArb,
      longTitle: longTitleArb,
      cluster: clusterArb,
      impactArea: impactAreaArb,
      pmId: pmIdArb,
      sponsorName: sponsorNameArb,
      contractValue: contractValueArb,
      contractTerm: contractTermArb,
      thisYearAmount: thisYearAmountArb,
      riskComplexity: riskLevelArb,
      reputationalRisk: riskLevelArb,
      healthNarrative: healthNarrativeArb,
      strategicObjectives: strategicObjectivesArb,
    }),
    datePairArb,
  )
  .map(([fields, dates]) => ({
    ...fields,
    startDate: dates.startDate,
    endDate: dates.endDate,
  }))

// ─── Property Tests ────────────────────────────────────────────────────────────

describe('Feature: portfolio-crud-operations, Property 1: Valid inputs pass validation', () => {
  it('should return no errors for any valid form state', () => {
    fc.assert(
      fc.property(validFormStateArb, (form) => {
        const errors = validateEditProjectForm(form)
        expect(Object.keys(errors).length).toBe(0)
      }),
      { numRuns: 100 },
    )
  })
})
