/**
 * Property Tests: Edit Project Form Validation
 *
 * Feature: portfolio-crud-operations
 * Property 2: Invalid inputs fail validation
 *
 * **Validates: Requirements 1.7, 1.10, 1.2**
 *
 * For any form state where at least one of the following holds — shortTitle is empty
 * or exceeds 100 characters, cluster is empty, pmId is empty, longTitle exceeds 255
 * characters, sponsorName exceeds 100 characters, contractValue is outside [0, 999999.9],
 * contractTerm is outside [0, 600] or non-integer, thisYearAmount is outside [0, 999999.9],
 * healthNarrative exceeds 2000 characters, or endDate is before startDate — the validation
 * function SHALL return at least one error and prevent submission.
 */
import { describe, it, expect } from "vitest"
import * as fc from "fast-check"
import {
  validateEditProjectForm,
  type EditProjectFormState,
} from "./edit-project-form"

// ─── Generators ────────────────────────────────────────────────────────────────

/** Generate a valid base form state that passes all validation */
const validFormArb: fc.Arbitrary<EditProjectFormState> = fc.record({
  shortTitle: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
  longTitle: fc.string({ minLength: 0, maxLength: 255 }),
  cluster: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
  impactArea: fc.string({ minLength: 0, maxLength: 50 }),
  pmId: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
  sponsorName: fc.string({ minLength: 0, maxLength: 100 }),
  strategicObjectives: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 5 }),
  contractValue: fc.oneof(
    fc.constant(""),
    fc.double({ min: 0, max: 999999.9, noNaN: true }).map((n) => String(n))
  ),
  contractTerm: fc.oneof(
    fc.constant(""),
    fc.integer({ min: 0, max: 600 }).map((n) => String(n))
  ),
  thisYearAmount: fc.oneof(
    fc.constant(""),
    fc.double({ min: 0, max: 999999.9, noNaN: true }).map((n) => String(n))
  ),
  startDate: fc.oneof(fc.constant(""), fc.date({ min: new Date("2000-01-01"), max: new Date("2030-12-31") }).map((d) => d.toISOString().split("T")[0])),
  endDate: fc.oneof(fc.constant(""), fc.date({ min: new Date("2000-01-01"), max: new Date("2030-12-31") }).map((d) => d.toISOString().split("T")[0])),
  riskComplexity: fc.constantFrom("LOW", "MEDIUM", "HIGH"),
  reputationalRisk: fc.constantFrom("LOW", "MEDIUM", "HIGH"),
  healthNarrative: fc.string({ minLength: 0, maxLength: 2000 }),
}).filter((form) => {
  // Ensure date ordering is valid when both are set
  if (form.startDate && form.endDate) {
    return form.endDate >= form.startDate
  }
  return true
})

/**
 * Constraint violations: each produces a form mutation that violates exactly one constraint.
 * We use fc.oneof to pick which constraint to violate on a valid base form.
 */
type Violation = (form: EditProjectFormState) => EditProjectFormState

const violateShortTitleEmpty: fc.Arbitrary<Violation> = fc.constantFrom(
  (form: EditProjectFormState) => ({ ...form, shortTitle: "" }),
  (form: EditProjectFormState) => ({ ...form, shortTitle: "   " })
)

const violateShortTitleTooLong: fc.Arbitrary<Violation> = fc
  .integer({ min: 101, max: 200 })
  .map((len) => (form: EditProjectFormState) => ({ ...form, shortTitle: "x".repeat(len) }))

const violateClusterEmpty: fc.Arbitrary<Violation> = fc.constantFrom(
  (form: EditProjectFormState) => ({ ...form, cluster: "" }),
  (form: EditProjectFormState) => ({ ...form, cluster: "   " })
)

const violatePmIdEmpty: fc.Arbitrary<Violation> = fc.constantFrom(
  (form: EditProjectFormState) => ({ ...form, pmId: "" }),
  (form: EditProjectFormState) => ({ ...form, pmId: "   " })
)

const violateLongTitleTooLong: fc.Arbitrary<Violation> = fc
  .integer({ min: 256, max: 500 })
  .map((len) => (form: EditProjectFormState) => ({ ...form, longTitle: "a".repeat(len) }))

const violateSponsorNameTooLong: fc.Arbitrary<Violation> = fc
  .integer({ min: 101, max: 200 })
  .map((len) => (form: EditProjectFormState) => ({ ...form, sponsorName: "b".repeat(len) }))

const violateContractValueOutOfRange: fc.Arbitrary<Violation> = fc.oneof(
  fc.double({ min: -10000, max: -0.01, noNaN: true }).map(
    (n) => (form: EditProjectFormState) => ({ ...form, contractValue: String(n) })
  ),
  fc.double({ min: 999999.91, max: 9999999, noNaN: true }).map(
    (n) => (form: EditProjectFormState) => ({ ...form, contractValue: String(n) })
  ),
  fc.constant((form: EditProjectFormState) => ({ ...form, contractValue: "notanumber" }))
)

const violateContractTermOutOfRange: fc.Arbitrary<Violation> = fc.oneof(
  fc.integer({ min: -1000, max: -1 }).map(
    (n) => (form: EditProjectFormState) => ({ ...form, contractTerm: String(n) })
  ),
  fc.integer({ min: 601, max: 5000 }).map(
    (n) => (form: EditProjectFormState) => ({ ...form, contractTerm: String(n) })
  ),
  // Non-integer
  fc.double({ min: 0.1, max: 599.9, noNaN: true })
    .filter((n) => !Number.isInteger(n))
    .map((n) => (form: EditProjectFormState) => ({ ...form, contractTerm: String(n) })),
  fc.constant((form: EditProjectFormState) => ({ ...form, contractTerm: "abc" }))
)

const violateThisYearAmountOutOfRange: fc.Arbitrary<Violation> = fc.oneof(
  fc.double({ min: -10000, max: -0.01, noNaN: true }).map(
    (n) => (form: EditProjectFormState) => ({ ...form, thisYearAmount: String(n) })
  ),
  fc.double({ min: 999999.91, max: 9999999, noNaN: true }).map(
    (n) => (form: EditProjectFormState) => ({ ...form, thisYearAmount: String(n) })
  ),
  fc.constant((form: EditProjectFormState) => ({ ...form, thisYearAmount: "xyz" }))
)

const violateHealthNarrativeTooLong: fc.Arbitrary<Violation> = fc
  .integer({ min: 2001, max: 3000 })
  .map((len) => (form: EditProjectFormState) => ({ ...form, healthNarrative: "c".repeat(len) }))

const violateEndDateBeforeStartDate: fc.Arbitrary<Violation> = fc
  .tuple(
    fc.date({ min: new Date("2001-01-01"), max: new Date("2030-12-31") }),
    fc.integer({ min: 1, max: 365 })
  )
  .map(([start, daysBefore]) => {
    const endDate = new Date(start.getTime() - daysBefore * 86400000)
    const startStr = start.toISOString().split("T")[0]
    const endStr = endDate.toISOString().split("T")[0]
    return (form: EditProjectFormState) => ({ ...form, startDate: startStr, endDate: endStr })
  })

/** Pick one or more violations to apply to a valid form */
const violationArb: fc.Arbitrary<Violation> = fc.oneof(
  violateShortTitleEmpty,
  violateShortTitleTooLong,
  violateClusterEmpty,
  violatePmIdEmpty,
  violateLongTitleTooLong,
  violateSponsorNameTooLong,
  violateContractValueOutOfRange,
  violateContractTermOutOfRange,
  violateThisYearAmountOutOfRange,
  violateHealthNarrativeTooLong,
  violateEndDateBeforeStartDate
)

// ─── Property Test ─────────────────────────────────────────────────────────────

describe("Feature: portfolio-crud-operations, Property 2: Invalid inputs fail validation", () => {
  /**
   * **Validates: Requirements 1.7, 1.10, 1.2**
   */
  it("any form with at least one violated constraint returns at least one validation error", () => {
    fc.assert(
      fc.property(
        validFormArb,
        violationArb,
        (baseForm, violation) => {
          const invalidForm = violation(baseForm)
          const errors = validateEditProjectForm(invalidForm)
          expect(Object.keys(errors).length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})
