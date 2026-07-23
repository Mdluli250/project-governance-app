/**
 * Concurrent Fetch Independence Property Tests
 *
 * Feature: paginated-data-loading
 * Property 13: Concurrent fetch independence
 *
 * **Validates: Requirements 7.4**
 *
 * For any two fetch operations initiated concurrently for different resources,
 * each SHALL resolve independently and write only to its own state slice without
 * corrupting or overwriting the other's data.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { createLoadingManager, DEBOUNCE_MS } from '@/lib/loading-state'
import type { LoadingManager } from '@/lib/loading-state'

// ─── Test Setup ────────────────────────────────────────────────────────────────

describe('Property 13: Concurrent fetch independence', () => {
  let manager: LoadingManager

  beforeEach(() => {
    vi.useFakeTimers()
    manager = createLoadingManager()
  })

  afterEach(() => {
    manager.destroy()
    vi.useRealTimers()
  })

  // ─── Arbitraries ─────────────────────────────────────────────────────────────

  /** Generate a valid resource key from a predefined set of resource names */
  const resourceNames = [
    'dashboard', 'portfolio', 'sessions', 'audit', 'project-1',
    'project-2', 'project-3', 'users', 'config', 'reports',
    'detail-a', 'detail-b', 'detail-c', 'list-x', 'list-y',
  ]
  const keyArb = fc.constantFrom(...resourceNames)

  /** Generate a pair of distinct keys */
  const distinctKeyPairArb = fc
    .tuple(keyArb, keyArb)
    .filter(([a, b]) => a !== b)

  /** Generate a set of distinct keys (2-5 keys) */
  const distinctKeySetArb = fc
    .uniqueArray(keyArb, { minLength: 2, maxLength: 5 })

  /** Generate an arbitrary duration for advancing timers */
  const durationArb = fc.integer({ min: 0, max: 2000 })

  /** Generate an error message */
  const errorMsgArb = fc.constantFrom(
    'Network error', 'Timeout', 'Server error 500',
    'Not found', 'Unauthorized', 'Connection refused'
  )

  // ─── Property Tests ──────────────────────────────────────────────────────────

  /**
   * **Validates: Requirements 7.4**
   *
   * Starting loading for key A and completing it does not affect key B's state.
   */
  it('completing a fetch for key A does not affect key B state', () => {
    fc.assert(
      fc.property(distinctKeyPairArb, durationArb, ([keyA, keyB], duration) => {
        // Start loading for both keys concurrently
        const opIdA = manager.startLoading(keyA)
        const opIdB = manager.startLoading(keyB)

        // Advance time past debounce so both are in loading state
        vi.advanceTimersByTime(DEBOUNCE_MS + 1)

        // Both should be loading
        expect(manager.getState(keyA).isLoading).toBe(true)
        expect(manager.getState(keyB).isLoading).toBe(true)

        // Complete key A
        manager.endLoading(keyA, opIdA)

        // Key A should no longer be loading
        expect(manager.getState(keyA).isLoading).toBe(false)
        expect(manager.getState(keyA).error).toBeNull()

        // Key B should still be loading — not affected by A's completion
        expect(manager.getState(keyB).isLoading).toBe(true)
        expect(manager.getState(keyB).error).toBeNull()

        // Now complete key B
        manager.endLoading(keyB, opIdB)

        // Key B should no longer be loading
        expect(manager.getState(keyB).isLoading).toBe(false)
        expect(manager.getState(keyB).error).toBeNull()

        // Key A should remain unchanged
        expect(manager.getState(keyA).isLoading).toBe(false)
        expect(manager.getState(keyA).error).toBeNull()

        // Clean up for next iteration
        manager.destroy()
        manager = createLoadingManager()
      }),
      { numRuns: 100 }
    )
  })

  /**
   * **Validates: Requirements 7.4**
   *
   * Setting error on key A does not affect key B's state.
   */
  it('setting error on key A does not affect key B state', () => {
    fc.assert(
      fc.property(
        distinctKeyPairArb,
        errorMsgArb,
        ([keyA, keyB], errorMsg) => {
          // Start loading for both keys concurrently
          const opIdA = manager.startLoading(keyA)
          const opIdB = manager.startLoading(keyB)

          // Advance past debounce
          vi.advanceTimersByTime(DEBOUNCE_MS + 1)

          // Set error on key A
          manager.setError(keyA, opIdA, errorMsg)

          // Key A should have the error and not be loading
          expect(manager.getState(keyA).isLoading).toBe(false)
          expect(manager.getState(keyA).error).toBe(errorMsg)

          // Key B should still be loading with no error — unaffected by A's error
          expect(manager.getState(keyB).isLoading).toBe(true)
          expect(manager.getState(keyB).error).toBeNull()

          // Complete key B normally
          manager.endLoading(keyB, opIdB)

          // Key B should be done with no error
          expect(manager.getState(keyB).isLoading).toBe(false)
          expect(manager.getState(keyB).error).toBeNull()

          // Key A should still have its error (not cleared by B's completion)
          expect(manager.getState(keyA).error).toBe(errorMsg)

          // Clean up for next iteration
          manager.destroy()
          manager = createLoadingManager()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Validates: Requirements 7.4**
   *
   * Multiple concurrent operations on different keys maintain independent states.
   * Generate a random set of distinct keys, start loading on all, then resolve them
   * in random order — each key's final state should reflect only its own resolution.
   */
  it('multiple concurrent operations on different keys maintain independent states', () => {
    fc.assert(
      fc.property(
        distinctKeySetArb,
        fc.boolean(),
        (keys, resolveWithError) => {
          // Start loading on all keys
          const operations = keys.map((key) => ({
            key,
            opId: manager.startLoading(key),
          }))

          // Advance past debounce so all show loading
          vi.advanceTimersByTime(DEBOUNCE_MS + 1)

          // All should be loading
          for (const { key } of operations) {
            expect(manager.getState(key).isLoading).toBe(true)
            expect(manager.getState(key).error).toBeNull()
          }

          // Resolve them one at a time in order; after each resolution, verify
          // the other keys are unaffected
          for (let i = 0; i < operations.length; i++) {
            const { key, opId } = operations[i]

            // Alternate between success and error based on index and boolean
            if (resolveWithError && i % 2 === 0) {
              manager.setError(key, opId, `error-${key}`)
            } else {
              manager.endLoading(key, opId)
            }

            // Verify the resolved key is no longer loading
            expect(manager.getState(key).isLoading).toBe(false)

            // Verify all unresolved keys are still loading
            for (let j = i + 1; j < operations.length; j++) {
              const otherKey = operations[j].key
              expect(manager.getState(otherKey).isLoading).toBe(true)
              expect(manager.getState(otherKey).error).toBeNull()
            }
          }

          // Final verification: each key's state reflects only its own resolution
          for (let i = 0; i < operations.length; i++) {
            const { key } = operations[i]
            const state = manager.getState(key)
            expect(state.isLoading).toBe(false)

            if (resolveWithError && i % 2 === 0) {
              expect(state.error).toBe(`error-${key}`)
            } else {
              expect(state.error).toBeNull()
            }
          }

          // Clean up for next iteration
          manager.destroy()
          manager = createLoadingManager()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Validates: Requirements 7.4**
   *
   * For random pairs of distinct keys, no cross-contamination occurs when
   * operations complete at different times.
   */
  it('staggered completions on distinct keys do not cross-contaminate', () => {
    fc.assert(
      fc.property(
        distinctKeyPairArb,
        durationArb,
        durationArb,
        ([keyA, keyB], delayA, delayB) => {
          // Start both concurrently
          const opIdA = manager.startLoading(keyA)
          const opIdB = manager.startLoading(keyB)

          // Advance time for key A's resolution (may be before or after debounce)
          vi.advanceTimersByTime(delayA)

          // Snapshot B's state before A completes
          const stateB_before = { ...manager.getState(keyB) }

          // Complete key A
          manager.endLoading(keyA, opIdA)

          // Key B's loading/error state should not have changed due to A's completion
          // (isLoading may have changed due to its own debounce timer firing, not A)
          const stateB_after = manager.getState(keyB)
          expect(stateB_after.error).toBe(stateB_before.error)

          // Advance more time for key B's resolution
          vi.advanceTimersByTime(delayB)

          // Complete key B
          manager.endLoading(keyB, opIdB)

          // Both should be in idle state
          expect(manager.getState(keyA).isLoading).toBe(false)
          expect(manager.getState(keyA).error).toBeNull()
          expect(manager.getState(keyB).isLoading).toBe(false)
          expect(manager.getState(keyB).error).toBeNull()

          // Clean up for next iteration
          manager.destroy()
          manager = createLoadingManager()
        }
      ),
      { numRuns: 100 }
    )
  })
})
