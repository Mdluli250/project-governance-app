/**
 * Property 3: Classification derivation follows 2-of-3 rule
 *
 * **Validates: Requirements 1.8**
 *
 * For any combination of contractValue (numeric ≥ 0), riskComplexity (LOW | MEDIUM | HIGH),
 * and reputationalRisk (LOW | MEDIUM | HIGH), the derived classification SHALL equal "A"
 * when 2+ factors are HIGH-tier, "B" when the combination of HIGH and MEDIUM factors
 * reaches 2+ with at least one MEDIUM, and "C" otherwise — matching the existing
 * `deriveClassification` function's logic.
 *
 * Feature: portfolio-crud-operations, Property 3: Classification derivation follows 2-of-3 rule
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { deriveClassification } from '@/lib/rules'
import type { RiskComplexity, ReputationalRisk, Classification } from '@/lib/types'

// ─── Reference Oracle ──────────────────────────────────────────────────────────

/**
 * Independent reference implementation of the 2-of-3 rule.
 * This acts as an oracle to verify the production function against.
 *
 * Tier mapping:
 * - contractValue >= 50 → HIGH-tier
 * - contractValue >= 10 (but < 50) → MEDIUM-tier
 * - contractValue < 10 → LOW-tier
 * - riskComplexity/reputationalRisk "HIGH" → HIGH-tier
 * - riskComplexity/reputationalRisk "MEDIUM" → MEDIUM-tier
 * - riskComplexity/reputationalRisk "LOW" → LOW-tier
 *
 * Classification:
 * - "A" when 2+ factors are HIGH-tier
 * - "B" when HIGH + MEDIUM factors total 2+ with at least one MEDIUM
 * - "C" otherwise
 */
function oracleClassification(
  contractValue: number,
  riskComplexity: RiskComplexity,
  reputationalRisk: ReputationalRisk
): Classification {
  let highCount = 0
  let mediumCount = 0

  // Factor 1: Contract value tier
  if (contractValue >= 50) highCount++
  else if (contractValue >= 10) mediumCount++

  // Factor 2: Risk complexity tier
  if (riskComplexity === 'HIGH') highCount++
  else if (riskComplexity === 'MEDIUM') mediumCount++

  // Factor 3: Reputational risk tier
  if (reputationalRisk === 'HIGH') highCount++
  else if (reputationalRisk === 'MEDIUM') mediumCount++

  // 2-of-3 rule
  if (highCount >= 2) return 'A'
  if (highCount + mediumCount >= 2 && mediumCount >= 1) return 'B'
  return 'C'
}

// ─── Generators ────────────────────────────────────────────────────────────────

const contractValueArb = fc.float({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true })
const riskComplexityArb = fc.constantFrom<RiskComplexity>('LOW', 'MEDIUM', 'HIGH')
const reputationalRiskArb = fc.constantFrom<ReputationalRisk>('LOW', 'MEDIUM', 'HIGH')

const classificationInputArb = fc.record({
  contractValue: contractValueArb,
  riskComplexity: riskComplexityArb,
  reputationalRisk: reputationalRiskArb,
})

// ─── Property Tests ────────────────────────────────────────────────────────────

describe('Feature: portfolio-crud-operations, Property 3: Classification derivation follows 2-of-3 rule', () => {
  it('deriveClassification matches the 2-of-3 rule oracle for all valid inputs', () => {
    fc.assert(
      fc.property(classificationInputArb, ({ contractValue, riskComplexity, reputationalRisk }) => {
        const actual = deriveClassification(contractValue, riskComplexity, reputationalRisk)
        const expected = oracleClassification(contractValue, riskComplexity, reputationalRisk)

        expect(actual).toBe(expected)
      }),
      { numRuns: 100 },
    )
  })

  it('classification is always one of A, B, or C', () => {
    fc.assert(
      fc.property(classificationInputArb, ({ contractValue, riskComplexity, reputationalRisk }) => {
        const result = deriveClassification(contractValue, riskComplexity, reputationalRisk)
        expect(['A', 'B', 'C']).toContain(result)
      }),
      { numRuns: 100 },
    )
  })

  it('returns "A" when 2 or more factors are HIGH-tier', () => {
    // Generate inputs where at least 2 factors are HIGH-tier
    const highTierContractValue = fc.float({ min: 50, max: 1_000_000, noNaN: true, noDefaultInfinity: true })

    const twoHighArb = fc.oneof(
      // contractValue HIGH + riskComplexity HIGH
      fc.record({
        contractValue: highTierContractValue,
        riskComplexity: fc.constant<RiskComplexity>('HIGH'),
        reputationalRisk: reputationalRiskArb,
      }),
      // contractValue HIGH + reputationalRisk HIGH
      fc.record({
        contractValue: highTierContractValue,
        riskComplexity: riskComplexityArb,
        reputationalRisk: fc.constant<ReputationalRisk>('HIGH'),
      }),
      // riskComplexity HIGH + reputationalRisk HIGH
      fc.record({
        contractValue: contractValueArb,
        riskComplexity: fc.constant<RiskComplexity>('HIGH'),
        reputationalRisk: fc.constant<ReputationalRisk>('HIGH'),
      }),
    )

    fc.assert(
      fc.property(twoHighArb, ({ contractValue, riskComplexity, reputationalRisk }) => {
        const result = deriveClassification(contractValue, riskComplexity, reputationalRisk)
        expect(result).toBe('A')
      }),
      { numRuns: 100 },
    )
  })

  it('returns "C" when all factors are LOW-tier', () => {
    const allLowArb = fc.record({
      contractValue: fc.float({ min: 0, max: Math.fround(9.999), noNaN: true, noDefaultInfinity: true }),
      riskComplexity: fc.constant<RiskComplexity>('LOW'),
      reputationalRisk: fc.constant<ReputationalRisk>('LOW'),
    })

    fc.assert(
      fc.property(allLowArb, ({ contractValue, riskComplexity, reputationalRisk }) => {
        const result = deriveClassification(contractValue, riskComplexity, reputationalRisk)
        expect(result).toBe('C')
      }),
      { numRuns: 100 },
    )
  })
})
