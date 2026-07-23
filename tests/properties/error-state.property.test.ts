/**
 * Error State Exposure Property Tests
 *
 * Feature: paginated-data-loading
 * Property 12: Error state exposure on fetch failure
 *
 * **Validates: Requirements 7.3**
 *
 * For any failed fetch operation, the store SHALL expose an error state with a
 * non-null message and SHALL provide a retry function that, when called,
 * re-initiates the fetch.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { createLoadingManager, DEBOUNCE_MS } from '@/lib/loading-state'
import type { LoadingManager } from '@/lib/loading-state'

// ─── Arbitraries ───────────────────────────────────────────────────────────────

/**
 * Generates random resource keys (non-empty strings) to prove the property
 * holds universally across any key.
 */
const resourceKeyArb: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 20 }).filter(
  (s) => s.trim().length > 0
)

/**
 * Generates random non-empty error messages.
 */
const errorMessageArb: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 100 }).filter(
  (s) => s.trim().length > 0
)

// ─── Property Tests ────────────────────────────────────────────────────────────

describe('Property 12: Error state exposure on fetch failure', () => {
  let manager: LoadingManager

  beforeEach(() => {
    vi.useFakeTimers()
    manager = createLoadingManager()
  })

  afterEach(() => {
    manager.destroy()
    vi.useRealTimers()
  })

  /**
   * **Validates: Requirements 7.3**
   *
   * After setError(key, opId, msg), getState(key).error equals msg (non-null).
   */
  it('after setError, error state exposes the non-null error message', () => {
    fc.assert(
      fc.property(resourceKeyArb, errorMessageArb, (key, errorMsg) => {
        const opId = manager.startLoading(key)
        vi.advanceTimersByTime(DEBOUNCE_MS + 1)

        manager.setError(key, opId, errorMsg)

        const state = manager.getState(key)
        expect(state.error).toBe(errorMsg)
        expect(state.error).not.toBeNull()

        // Also verify via getErrors()
        const errors = manager.getErrors()
        expect(errors[key]).toBe(errorMsg)

        // Clean up for next iteration
        manager.destroy()
        manager = createLoadingManager()
      }),
      { numRuns: 100 }
    )
  })

  /**
   * **Validates: Requirements 7.3**
   *
   * After setError, isLoading is false (the operation has completed with failure).
   */
  it('after setError, isLoading is false', () => {
    fc.assert(
      fc.property(resourceKeyArb, errorMessageArb, (key, errorMsg) => {
        const opId = manager.startLoading(key)
        vi.advanceTimersByTime(DEBOUNCE_MS + 1)

        manager.setError(key, opId, errorMsg)

        const state = manager.getState(key)
        expect(state.isLoading).toBe(false)

        // Clean up for next iteration
        manager.destroy()
        manager = createLoadingManager()
      }),
      { numRuns: 100 }
    )
  })

  /**
   * **Validates: Requirements 7.3**
   *
   * After registerFetch(key, fn) and calling retry(key), the registered fn is called.
   * This proves the retry mechanism re-initiates the fetch.
   */
  it('retry calls the registered fetch function', () => {
    fc.assert(
      fc.property(resourceKeyArb, errorMessageArb, (key, errorMsg) => {
        let callCount = 0
        const fetchFn = async () => {
          callCount++
        }

        // Set up: start loading, set error, register fetch
        const opId = manager.startLoading(key)
        manager.setError(key, opId, errorMsg)
        manager.registerFetch(key, fetchFn)

        // Act: retry
        manager.retry(key)

        // Assert: fetch function was called
        expect(callCount).toBe(1)

        // Clean up for next iteration
        manager.destroy()
        manager = createLoadingManager()
      }),
      { numRuns: 100 }
    )
  })

  /**
   * **Validates: Requirements 7.3**
   *
   * Error state is exposed even if setError is called before the debounce timer fires
   * (i.e., fast failures still expose error state).
   */
  it('error state is exposed even for fast failures (before debounce)', () => {
    fc.assert(
      fc.property(resourceKeyArb, errorMessageArb, (key, errorMsg) => {
        const opId = manager.startLoading(key)
        // Don't advance timers - simulate a fast failure
        manager.setError(key, opId, errorMsg)

        const state = manager.getState(key)
        expect(state.error).toBe(errorMsg)
        expect(state.error).not.toBeNull()
        expect(state.isLoading).toBe(false)

        // Clean up for next iteration
        manager.destroy()
        manager = createLoadingManager()
      }),
      { numRuns: 100 }
    )
  })
})
