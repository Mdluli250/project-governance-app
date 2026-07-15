import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { canPerformAction } from '@/lib/rules'
import type { UserRole, User } from '@/lib/types'

/**
 * Feature: session-delete, Property 1: DELETE_SESSION permission is role-exclusive
 * Validates: Requirements 1.1, 1.2, 1.3, 5.1
 *
 * For any user, `canPerformAction(user, "DELETE_SESSION")` returns `true` if and only if
 * the user's role is POC_CHAIR or ADMIN. For all other roles (PM, POC_MEMBER), it returns `false`.
 */

// ─── Enum Values ─────────────────────────────────────────────────────────────

const allRoles: UserRole[] = ['PM', 'POC_MEMBER', 'POC_CHAIR', 'ADMIN']

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** Arbitrary for a User with any valid role */
const arbUser: fc.Arbitrary<User> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  email: fc.emailAddress(),
  role: fc.constantFrom(...allRoles),
  cluster: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  impactArea: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  passwordChanged: fc.option(fc.boolean(), { nil: undefined }),
})

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: session-delete, Property 1: DELETE_SESSION permission is role-exclusive', () => {
  it('canPerformAction(user, "DELETE_SESSION") returns true only for POC_CHAIR and ADMIN roles', () => {
    fc.assert(
      fc.property(arbUser, (user) => {
        const result = canPerformAction(user, 'DELETE_SESSION')
        const expectedAllowed = user.role === 'POC_CHAIR' || user.role === 'ADMIN'

        expect(result).toBe(expectedAllowed)
      }),
      { numRuns: 100 }
    )
  })
})
