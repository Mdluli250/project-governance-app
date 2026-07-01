import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { mapProfile } from '@/lib/prisma-mappers'
import type { ProfileRow } from '@/lib/prisma-mappers'
import type { UserRole } from '@prisma/client'

/**
 * Feature: prisma-migration, Property 1: Profile mapping round-trip preserves identity
 * Validates: Requirements 9.1, 9.3
 */

const userRoles: UserRole[] = ['PM', 'POC_MEMBER', 'POC_CHAIR', 'ADMIN']

/** Arbitrary for a valid Prisma Profile record */
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

describe('Feature: prisma-migration, Property 1: Profile mapping round-trip preserves identity', () => {
  it('should map all non-null fields correctly and convert null optional fields to undefined', () => {
    fc.assert(
      fc.property(arbProfileRow, (profile) => {
        const result = mapProfile(profile)

        // Non-null required fields are preserved exactly
        expect(result.id).toBe(profile.id)
        expect(result.name).toBe(profile.name)
        expect(result.email).toBe(profile.email)
        expect(result.role).toBe(profile.role)
        expect(result.passwordChanged).toBe(profile.passwordChanged)

        // Nullable fields: null → undefined, non-null → preserved value
        if (profile.cluster === null) {
          expect(result.cluster).toBeUndefined()
        } else {
          expect(result.cluster).toBe(profile.cluster)
        }

        if (profile.impactArea === null) {
          expect(result.impactArea).toBeUndefined()
        } else {
          expect(result.impactArea).toBe(profile.impactArea)
        }

        // Result should never contain null for optional fields
        expect(result.cluster).not.toBeNull()
        expect(result.impactArea).not.toBeNull()
      }),
      { numRuns: 200 }
    )
  })
})
