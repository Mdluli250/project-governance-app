import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { mapProfile, mapAction, mapAudit } from '@/lib/prisma-mappers'
import type { ProfileRow, ActionRow, AuditRow } from '@/lib/prisma-mappers'
import type { UserRole, ActionStatus, ActionCategory, AuditType } from '@prisma/client'

/**
 * Feature: prisma-migration, Property 5: Null-to-undefined conversion is consistent
 * Validates: Requirements 9.3
 *
 * For any Prisma model result containing nullable fields, the corresponding mapper
 * function SHALL convert every `null` value to `undefined` for fields typed as
 * optional (`?`) in the application type interfaces, and SHALL never produce `null`
 * in the output for these fields.
 */

// ─── Enum Values ─────────────────────────────────────────────────────────────

const userRoles: UserRole[] = ['PM', 'POC_MEMBER', 'POC_CHAIR', 'ADMIN']

const actionStatuses: ActionStatus[] = ['OPEN', 'IN_PROGRESS', 'CLOSED']

const actionCategories: ActionCategory[] = [
  'GOVERNANCE', 'RISK', 'SHEQ', 'COMPLIANCE', 'DATA', 'CONTRACT', 'SCHEDULE', 'FINANCE',
]

const auditTypes: AuditType[] = [
  'CLASSIFICATION_CHANGE', 'RAG_CHANGE', 'POC_DECISION', 'KDA_DECISION',
  'ACTION_CHANGE', 'HEALTH_UPDATE', 'PROJECT_UPDATE', 'REVIEW_CREATED', 'RISK',
]

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** Arbitrary for Profile with nullable fields set to null or valid string */
const arbProfileRow: fc.Arbitrary<ProfileRow> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  email: fc.emailAddress(),
  role: fc.constantFrom(...userRoles),
  cluster: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
  impactArea: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
  passwordHash: fc.option(fc.string({ minLength: 10, maxLength: 60 }), { nil: null }),
  passwordChanged: fc.boolean(),
  createdAt: fc.date(),
  updatedAt: fc.date(),
})

/** Arbitrary for Action with nullable fields set to null or valid values */
const arbActionRow: fc.Arbitrary<ActionRow> = fc.record({
  id: fc.uuid(),
  projectId: fc.uuid(),
  reviewId: fc.option(fc.uuid(), { nil: null }),
  description: fc.string({ minLength: 1, maxLength: 200 }),
  owner: fc.string({ minLength: 1, maxLength: 50 }),
  dueDate: fc.option(
    fc.date({ min: new Date('2000-01-01'), max: new Date('2100-01-01'), noInvalidDate: true }),
    { nil: null }
  ),
  status: fc.constantFrom(...actionStatuses),
  category: fc.constantFrom(...actionCategories),
  evidenceLinks: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { maxLength: 5 }),
  createdAt: fc.date({ noInvalidDate: true }),
  updatedAt: fc.date({ noInvalidDate: true }),
})

/** Arbitrary for AuditLog with nullable fields set to null or valid string */
const arbAuditRow: fc.Arbitrary<AuditRow> = fc.record({
  id: fc.uuid(),
  projectId: fc.uuid(),
  timestamp: fc.date({ noInvalidDate: true }),
  actor: fc.string({ minLength: 1, maxLength: 50 }),
  type: fc.constantFrom(...auditTypes),
  description: fc.string({ minLength: 1, maxLength: 300 }),
  oldValue: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
  newValue: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
})

// ─── Helper: Check no field is null ─────────────────────────────────────────

/**
 * Asserts that no property of the output object has the value `null`.
 * Fields should be either a valid value or `undefined`, never `null`.
 */
function assertNoNullValues(obj: Record<string, unknown>, modelName: string) {
  for (const [key, value] of Object.entries(obj)) {
    expect(value, `${modelName}.${key} should not be null`).not.toBeNull()
  }
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: prisma-migration, Property 5: Null-to-undefined conversion is consistent', () => {
  it('Profile mapper never produces null — cluster and impactArea become undefined when null', () => {
    fc.assert(
      fc.property(arbProfileRow, (row) => {
        const result = mapProfile(row)

        // Generic no-null check across entire output
        assertNoNullValues(result as unknown as Record<string, unknown>, 'Profile')

        // Specific nullable field assertions
        if (row.cluster === null) {
          expect(result.cluster).toBeUndefined()
        } else {
          expect(result.cluster).toBe(row.cluster)
        }

        if (row.impactArea === null) {
          expect(result.impactArea).toBeUndefined()
        } else {
          expect(result.impactArea).toBe(row.impactArea)
        }
      }),
      { numRuns: 100 }
    )
  })

  it('Action mapper never produces null — reviewId becomes undefined, dueDate becomes empty string', () => {
    fc.assert(
      fc.property(arbActionRow, (row) => {
        const result = mapAction(row)

        // Generic no-null check across entire output
        assertNoNullValues(result as unknown as Record<string, unknown>, 'Action')

        // reviewId: null → undefined (optional field in Action type)
        if (row.reviewId === null) {
          expect(result.reviewId).toBeUndefined()
        } else {
          expect(result.reviewId).toBe(row.reviewId)
        }

        // dueDate: null → empty string (not null), non-null → ISO string
        if (row.dueDate === null) {
          expect(result.dueDate).toBe('')
        } else {
          expect(result.dueDate).toBe(row.dueDate.toISOString())
        }
      }),
      { numRuns: 100 }
    )
  })

  it('AuditLog mapper never produces null — oldValue and newValue become undefined when null', () => {
    fc.assert(
      fc.property(arbAuditRow, (row) => {
        const result = mapAudit(row)

        // Generic no-null check across entire output
        assertNoNullValues(result as unknown as Record<string, unknown>, 'AuditLog')

        // oldValue: null → undefined
        if (row.oldValue === null) {
          expect(result.oldValue).toBeUndefined()
        } else {
          expect(result.oldValue).toBe(row.oldValue)
        }

        // newValue: null → undefined
        if (row.newValue === null) {
          expect(result.newValue).toBeUndefined()
        } else {
          expect(result.newValue).toBe(row.newValue)
        }
      }),
      { numRuns: 100 }
    )
  })
})
