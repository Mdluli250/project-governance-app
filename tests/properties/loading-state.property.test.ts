/**
 * Loading State Property Tests
 *
 * Feature: paginated-data-loading
 * Property 11: Loading indicator debounce
 *
 * **Validates: Requirements 7.2**
 *
 * For any fetch operation that resolves within 200ms, the loading state SHALL never
 * be exposed as true to consumers. For any fetch operation that takes longer than
 * 200ms, the loading state SHALL be true until resolution.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { createLoadingManager, DEBOUNCE_MS } from '@/lib/loading-state'
import type { LoadingManager } from '@/lib/loading-state'

// ─── Test Setup ────────────────────────────────────────────────────────────────

describe('Property 11: Loading indicator debounce', () => {
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

  /** Generate a duration in ms that is strictly less than DEBOUNCE_MS (0 to 199) */
  const fastDurationArb = fc.integer({ min: 0, max: DEBOUNCE_MS - 1 })

  /** Generate a duration in ms that is >= DEBOUNCE_MS (200 to 2000) */
  const slowDurationArb = fc.integer({ min: DEBOUNCE_MS, max: 2000 })

  /** Generate a valid resource key */
  const keyArb = fc.string({ minLength: 1, maxLength: 20 }).filter(
    (s) => s.trim().length > 0
  )

  // ─── Property Tests ──────────────────────────────────────────────────────────

  /**
   * **Validates: Requirements 7.2**
   *
   * If endLoading is called before 200ms elapses (advance < DEBOUNCE_MS),
   * isLoading is never true.
   */
  it('fast fetches (< 200ms) never expose isLoading = true', () => {
    fc.assert(
      fc.property(keyArb, fastDurationArb, (key, duration) => {
        const opId = manager.startLoading(key)

        // isLoading should be false immediately after start
        expect(manager.getState(key).isLoading).toBe(false)

        // Advance time by the fast duration (< 200ms)
        vi.advanceTimersByTime(duration)

        // isLoading should still be false because debounce hasn't fired
        expect(manager.getState(key).isLoading).toBe(false)

        // Complete the operation before the debounce threshold
        manager.endLoading(key, opId)

        // isLoading should remain false after completion
        expect(manager.getState(key).isLoading).toBe(false)

        // Even if we advance past the debounce time, it should stay false
        vi.advanceTimersByTime(DEBOUNCE_MS)
        expect(manager.getState(key).isLoading).toBe(false)

        // Clean up for next iteration
        manager.destroy()
        manager = createLoadingManager()
      }),
      { numRuns: 100 }
    )
  })

  /**
   * **Validates: Requirements 7.2**
   *
   * If 200ms+ elapses without endLoading, isLoading becomes true.
   */
  it('slow fetches (>= 200ms) expose isLoading = true after debounce', () => {
    fc.assert(
      fc.property(keyArb, slowDurationArb, (key, totalDuration) => {
        const opId = manager.startLoading(key)

        // isLoading should be false immediately after start
        expect(manager.getState(key).isLoading).toBe(false)

        // Advance time past the debounce threshold
        vi.advanceTimersByTime(DEBOUNCE_MS)

        // isLoading should now be true because the debounce fired
        expect(manager.getState(key).isLoading).toBe(true)

        // Advance the remaining time (totalDuration - DEBOUNCE_MS)
        const remaining = totalDuration - DEBOUNCE_MS
        if (remaining > 0) {
          vi.advanceTimersByTime(remaining)
          // Should still be loading since we haven't called endLoading
          expect(manager.getState(key).isLoading).toBe(true)
        }

        // Complete the operation
        manager.endLoading(key, opId)

        // After resolution, isLoading should be false
        expect(manager.getState(key).isLoading).toBe(false)

        // Clean up for next iteration
        manager.destroy()
        manager = createLoadingManager()
      }),
      { numRuns: 100 }
    )
  })

  /**
   * **Validates: Requirements 7.2**
   *
   * After endLoading (regardless of timing), isLoading is false.
   */
  it('after endLoading, isLoading is always false regardless of elapsed time', () => {
    fc.assert(
      fc.property(
        keyArb,
        fc.integer({ min: 0, max: 2000 }),
        (key, elapsedBeforeEnd) => {
          const opId = manager.startLoading(key)

          // Advance some arbitrary amount of time
          vi.advanceTimersByTime(elapsedBeforeEnd)

          // Complete the operation
          manager.endLoading(key, opId)

          // Regardless of how much time elapsed, isLoading should be false
          expect(manager.getState(key).isLoading).toBe(false)

          // Advancing more time shouldn't change anything
          vi.advanceTimersByTime(DEBOUNCE_MS * 2)
          expect(manager.getState(key).isLoading).toBe(false)

          // Clean up for next iteration
          manager.destroy()
          manager = createLoadingManager()
        }
      ),
      { numRuns: 100 }
    )
  })
})
