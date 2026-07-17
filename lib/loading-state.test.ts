import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { createLoadingManager, DEBOUNCE_MS, type LoadingManager } from "./loading-state"

describe("createLoadingManager", () => {
  let manager: LoadingManager

  beforeEach(() => {
    vi.useFakeTimers()
    manager = createLoadingManager()
  })

  afterEach(() => {
    manager.destroy()
    vi.useRealTimers()
  })

  describe("initial state", () => {
    it("returns default state for unknown keys", () => {
      const state = manager.getState("unknown")
      expect(state).toEqual({ isLoading: false, error: null, startedAt: null })
    })

    it("getLoadingStates returns empty record initially", () => {
      expect(manager.getLoadingStates()).toEqual({})
    })

    it("getErrors returns empty record initially", () => {
      expect(manager.getErrors()).toEqual({})
    })
  })

  describe("200ms debounce logic", () => {
    it("does not set isLoading=true immediately on startLoading", () => {
      manager.startLoading("dashboard")
      const state = manager.getState("dashboard")
      expect(state.isLoading).toBe(false)
      expect(state.startedAt).not.toBeNull()
    })

    it("sets isLoading=true after 200ms if still pending", () => {
      manager.startLoading("dashboard")

      vi.advanceTimersByTime(DEBOUNCE_MS)

      const state = manager.getState("dashboard")
      expect(state.isLoading).toBe(true)
    })

    it("does NOT set isLoading=true if resolved before 200ms", () => {
      const opId = manager.startLoading("dashboard")

      vi.advanceTimersByTime(100) // Only 100ms elapsed
      manager.endLoading("dashboard", opId)

      const state = manager.getState("dashboard")
      expect(state.isLoading).toBe(false)
    })

    it("clears isLoading on endLoading even after debounce fired", () => {
      const opId = manager.startLoading("dashboard")

      vi.advanceTimersByTime(DEBOUNCE_MS)
      expect(manager.getState("dashboard").isLoading).toBe(true)

      manager.endLoading("dashboard", opId)
      expect(manager.getState("dashboard").isLoading).toBe(false)
    })

    it("clears startedAt on endLoading", () => {
      const opId = manager.startLoading("dashboard")
      expect(manager.getState("dashboard").startedAt).not.toBeNull()

      manager.endLoading("dashboard", opId)
      expect(manager.getState("dashboard").startedAt).toBeNull()
    })
  })

  describe("error handling", () => {
    it("sets error state on setError", () => {
      const opId = manager.startLoading("portfolio")
      manager.setError("portfolio", opId, "Network error")

      const state = manager.getState("portfolio")
      expect(state.error).toBe("Network error")
      expect(state.isLoading).toBe(false)
      expect(state.startedAt).toBeNull()
    })

    it("clears error on next startLoading", () => {
      const opId = manager.startLoading("portfolio")
      manager.setError("portfolio", opId, "Failed")

      manager.startLoading("portfolio")
      expect(manager.getState("portfolio").error).toBeNull()
    })

    it("error does not trigger isLoading after debounce", () => {
      const opId = manager.startLoading("portfolio")
      manager.setError("portfolio", opId, "Oops")

      vi.advanceTimersByTime(DEBOUNCE_MS)
      expect(manager.getState("portfolio").isLoading).toBe(false)
    })
  })

  describe("concurrent independent states", () => {
    it("manages multiple keys independently", () => {
      const opA = manager.startLoading("dashboard")
      const opB = manager.startLoading("portfolio")

      vi.advanceTimersByTime(DEBOUNCE_MS)

      expect(manager.getState("dashboard").isLoading).toBe(true)
      expect(manager.getState("portfolio").isLoading).toBe(true)

      manager.endLoading("dashboard", opA)

      expect(manager.getState("dashboard").isLoading).toBe(false)
      expect(manager.getState("portfolio").isLoading).toBe(true)

      manager.endLoading("portfolio", opB)
      expect(manager.getState("portfolio").isLoading).toBe(false)
    })

    it("error on one key does not affect another", () => {
      const opA = manager.startLoading("dashboard")
      manager.startLoading("portfolio")

      manager.setError("dashboard", opA, "Error!")

      expect(manager.getState("dashboard").error).toBe("Error!")
      expect(manager.getState("portfolio").error).toBeNull()
    })

    it("getLoadingStates reflects all keys", () => {
      manager.startLoading("dashboard")
      manager.startLoading("portfolio")

      vi.advanceTimersByTime(DEBOUNCE_MS)

      const states = manager.getLoadingStates()
      expect(states.dashboard).toBe(true)
      expect(states.portfolio).toBe(true)
    })
  })

  describe("stale operation handling", () => {
    it("ignores endLoading for a stale operation ID", () => {
      const opId1 = manager.startLoading("dashboard")
      // Start a new operation before the first one completes
      manager.startLoading("dashboard")

      vi.advanceTimersByTime(DEBOUNCE_MS)
      expect(manager.getState("dashboard").isLoading).toBe(true)

      // Try to end with the stale operation ID
      manager.endLoading("dashboard", opId1)
      // Should still be loading because the second operation is active
      expect(manager.getState("dashboard").isLoading).toBe(true)
    })

    it("ignores setError for a stale operation ID", () => {
      const opId1 = manager.startLoading("dashboard")
      manager.startLoading("dashboard")

      manager.setError("dashboard", opId1, "Stale error")
      // Error should not be set for the stale operation
      expect(manager.getState("dashboard").error).toBeNull()
    })
  })

  describe("retry mechanism", () => {
    it("calls registered fetch function on retry", () => {
      const fetchFn = vi.fn().mockResolvedValue(undefined)
      manager.registerFetch("dashboard", fetchFn)

      manager.retry("dashboard")

      expect(fetchFn).toHaveBeenCalledTimes(1)
    })

    it("does nothing if no fetch is registered for key", () => {
      // Should not throw
      expect(() => manager.retry("unregistered")).not.toThrow()
    })
  })

  describe("subscribe", () => {
    it("notifies listeners on startLoading", () => {
      const listener = vi.fn()
      manager.subscribe(listener)

      manager.startLoading("dashboard")
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it("notifies listeners when debounce fires", () => {
      const listener = vi.fn()
      manager.subscribe(listener)

      manager.startLoading("dashboard")
      listener.mockClear()

      vi.advanceTimersByTime(DEBOUNCE_MS)
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it("notifies listeners on endLoading", () => {
      const opId = manager.startLoading("dashboard")
      const listener = vi.fn()
      manager.subscribe(listener)

      manager.endLoading("dashboard", opId)
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it("notifies listeners on setError", () => {
      const opId = manager.startLoading("dashboard")
      const listener = vi.fn()
      manager.subscribe(listener)

      manager.setError("dashboard", opId, "err")
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it("unsubscribe stops notifications", () => {
      const listener = vi.fn()
      const unsub = manager.subscribe(listener)

      unsub()
      manager.startLoading("dashboard")
      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe("destroy", () => {
    it("clears all timers and state", () => {
      manager.startLoading("dashboard")
      manager.startLoading("portfolio")

      manager.destroy()

      // Advancing timers should not cause errors or state changes
      vi.advanceTimersByTime(DEBOUNCE_MS)

      expect(manager.getState("dashboard")).toEqual({
        isLoading: false,
        error: null,
        startedAt: null,
      })
    })
  })
})
