/**
 * Dashboard Property Tests
 *
 * Feature: paginated-data-loading
 * Property 2: Overdue action count correctness
 *
 * **Validates: Requirements 1.2**
 *
 * For any set of actions with varied due dates and statuses, the dashboard summary
 * overdue action count SHALL equal the number of actions where dueDate < today
 * AND status !== 'CLOSED'.
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { countOverdueActions } from '@/lib/dashboard-aggregation'
import type { ActionStatus } from '@/lib/types'

// ─── Arbitraries ───────────────────────────────────────────────────────────────

const actionStatusArb: fc.Arbitrary<ActionStatus> = fc.constantFrom(
  'OPEN',
  'IN_PROGRESS',
  'CLOSED'
)

/**
 * Generates a date string in ISO format (YYYY-MM-DD) within a reasonable range
 * around a reference date to ensure we get a mix of past, today, and future dates.
 */
function dateAroundToday(today: Date): fc.Arbitrary<string> {
  // Generate dates within ±365 days of today
  const todayMs = today.getTime()
  const dayMs = 24 * 60 * 60 * 1000
  return fc.integer({ min: -365, max: 365 }).map((offsetDays) => {
    const d = new Date(todayMs + offsetDays * dayMs)
    return d.toISOString().split('T')[0]
  })
}

function actionArb(today: Date): fc.Arbitrary<{ dueDate: string; status: ActionStatus }> {
  return fc.record({
    dueDate: dateAroundToday(today),
    status: actionStatusArb,
  })
}

// ─── Property Tests ────────────────────────────────────────────────────────────

describe('Property 2: Overdue action count correctness', () => {
  // Use a fixed "today" for deterministic testing
  const today = new Date('2025-01-15')

  /**
   * **Validates: Requirements 1.2**
   *
   * For any set of actions with varied due dates and statuses, the overdue action
   * count SHALL equal the number of actions where dueDate < today AND status !== 'CLOSED'.
   */
  it('overdue count equals actions with dueDate < today AND status !== CLOSED', () => {
    fc.assert(
      fc.property(
        fc.array(actionArb(today), { minLength: 0, maxLength: 50 }),
        (actions) => {
          const result = countOverdueActions(actions, today)

          // Manually compute expected count using the definition
          const todayStart = new Date(today)
          todayStart.setHours(0, 0, 0, 0)

          const expected = actions.filter((action) => {
            const dueDate = new Date(action.dueDate)
            dueDate.setHours(0, 0, 0, 0)
            return dueDate < todayStart && action.status !== 'CLOSED'
          }).length

          expect(result).toBe(expected)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('closed actions are never counted as overdue regardless of due date', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            dueDate: dateAroundToday(today),
            status: fc.constant('CLOSED' as ActionStatus),
          }),
          { minLength: 1, maxLength: 30 }
        ),
        (closedActions) => {
          const result = countOverdueActions(closedActions, today)
          expect(result).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('actions with dueDate >= today are never counted as overdue', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            // Only generate dates that are today or in the future
            dueDate: fc.integer({ min: 0, max: 365 }).map((offsetDays) => {
              const d = new Date(today.getTime() + offsetDays * 24 * 60 * 60 * 1000)
              return d.toISOString().split('T')[0]
            }),
            status: actionStatusArb,
          }),
          { minLength: 1, maxLength: 30 }
        ),
        (futureActions) => {
          const result = countOverdueActions(futureActions, today)
          expect(result).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('overdue count is additive: count(A ∪ B) = count(A) + count(B) for disjoint sets', () => {
    fc.assert(
      fc.property(
        fc.array(actionArb(today), { minLength: 0, maxLength: 25 }),
        fc.array(actionArb(today), { minLength: 0, maxLength: 25 }),
        (actionsA, actionsB) => {
          const combined = [...actionsA, ...actionsB]
          const countCombined = countOverdueActions(combined, today)
          const countA = countOverdueActions(actionsA, today)
          const countB = countOverdueActions(actionsB, today)

          expect(countCombined).toBe(countA + countB)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('overdue count is always >= 0 and <= total number of actions', () => {
    fc.assert(
      fc.property(
        fc.array(actionArb(today), { minLength: 0, maxLength: 50 }),
        (actions) => {
          const result = countOverdueActions(actions, today)
          expect(result).toBeGreaterThanOrEqual(0)
          expect(result).toBeLessThanOrEqual(actions.length)
        }
      ),
      { numRuns: 100 }
    )
  })
})
