/**
 * Loading state manager utility with 200ms debounce logic.
 *
 * The debounce prevents UI flickering for fast responses:
 * - On fetch start, record startedAt but don't expose isLoading = true yet
 * - After 200ms, if the fetch is still pending, set isLoading = true
 * - On fetch complete (success or error), clear isLoading regardless of timing
 *
 * Supports concurrent independent loading states keyed by resource name.
 */

export interface LoadingState {
  isLoading: boolean
  error: string | null
  startedAt: number | null
}

export const DEBOUNCE_MS = 200

type Listener = () => void

export interface LoadingManager {
  /** Start a loading operation for the given key. Returns a unique operation ID. */
  startLoading(key: string): number
  /** End a loading operation for the given key with success. */
  endLoading(key: string, operationId: number): void
  /** End a loading operation for the given key with an error. */
  setError(key: string, operationId: number, error: string): void
  /** Get the current loading state for a given key. */
  getState(key: string): LoadingState
  /** Get all loading states as a record (isLoading only). */
  getLoadingStates(): Record<string, boolean>
  /** Get all errors as a record. */
  getErrors(): Record<string, string | null>
  /** Retry the last operation for a key by calling its registered fetch function. */
  retry(key: string): void
  /** Register a fetch function for retry support. */
  registerFetch(key: string, fetchFn: () => Promise<void>): void
  /** Subscribe to state changes. Returns an unsubscribe function. */
  subscribe(listener: Listener): () => void
  /** Destroy the manager, clearing all timers. */
  destroy(): void
}

interface InternalState {
  isLoading: boolean
  error: string | null
  startedAt: number | null
  timerId: ReturnType<typeof setTimeout> | null
  operationId: number
}

export function createLoadingManager(): LoadingManager {
  const states = new Map<string, InternalState>()
  const fetchRegistry = new Map<string, () => Promise<void>>()
  const listeners = new Set<Listener>()
  let nextOperationId = 1

  function getOrCreateState(key: string): InternalState {
    let state = states.get(key)
    if (!state) {
      state = {
        isLoading: false,
        error: null,
        startedAt: null,
        timerId: null,
        operationId: 0,
      }
      states.set(key, state)
    }
    return state
  }

  function notify() {
    rebuildSnapshots()
    for (const listener of listeners) {
      listener()
    }
  }

  function startLoading(key: string): number {
    const state = getOrCreateState(key)

    // Clear any existing timer from a previous operation
    if (state.timerId !== null) {
      clearTimeout(state.timerId)
      state.timerId = null
    }

    const operationId = nextOperationId++
    state.operationId = operationId
    state.startedAt = Date.now()
    state.error = null
    // Don't set isLoading = true yet; wait for debounce
    state.isLoading = false

    // After DEBOUNCE_MS, if this operation is still pending, expose isLoading
    state.timerId = setTimeout(() => {
      if (state.operationId === operationId && state.startedAt !== null) {
        state.isLoading = true
        state.timerId = null
        notify()
      }
    }, DEBOUNCE_MS)

    notify()
    return operationId
  }

  function endLoading(key: string, operationId: number): void {
    const state = states.get(key)
    if (!state) return

    // Only clear if this is the current operation (prevents stale completions)
    if (state.operationId !== operationId) return

    if (state.timerId !== null) {
      clearTimeout(state.timerId)
      state.timerId = null
    }

    state.isLoading = false
    state.error = null
    state.startedAt = null

    notify()
  }

  function setError(key: string, operationId: number, error: string): void {
    const state = states.get(key)
    if (!state) return

    // Only apply error if this is the current operation
    if (state.operationId !== operationId) return

    if (state.timerId !== null) {
      clearTimeout(state.timerId)
      state.timerId = null
    }

    state.isLoading = false
    state.error = error
    state.startedAt = null

    notify()
  }

  function getState(key: string): LoadingState {
    const state = states.get(key)
    if (!state) {
      return { isLoading: false, error: null, startedAt: null }
    }
    return {
      isLoading: state.isLoading,
      error: state.error,
      startedAt: state.startedAt,
    }
  }

  // Cached snapshots for useSyncExternalStore compatibility
  let cachedLoadingStates: Record<string, boolean> = {}
  let cachedErrors: Record<string, string | null> = {}

  function rebuildSnapshots() {
    const newLoading: Record<string, boolean> = Object.create(null)
    const newErrors: Record<string, string | null> = Object.create(null)
    for (const [key, state] of states) {
      newLoading[key] = state.isLoading
      newErrors[key] = state.error
    }
    cachedLoadingStates = newLoading
    cachedErrors = newErrors
  }

  function getLoadingStates(): Record<string, boolean> {
    return cachedLoadingStates
  }

  function getErrors(): Record<string, string | null> {
    return cachedErrors
  }

  function registerFetch(key: string, fetchFn: () => Promise<void>): void {
    fetchRegistry.set(key, fetchFn)
  }

  function retry(key: string): void {
    const fetchFn = fetchRegistry.get(key)
    if (fetchFn) {
      fetchFn()
    }
  }

  function subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  function destroy(): void {
    for (const [, state] of states) {
      if (state.timerId !== null) {
        clearTimeout(state.timerId)
      }
    }
    states.clear()
    fetchRegistry.clear()
    listeners.clear()
  }

  return {
    startLoading,
    endLoading,
    setError,
    getState,
    getLoadingStates,
    getErrors,
    retry,
    registerFetch,
    subscribe,
    destroy,
  }
}
