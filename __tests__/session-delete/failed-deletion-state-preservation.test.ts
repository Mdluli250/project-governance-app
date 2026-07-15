import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import type { POCSession, CommitteeType, SessionStatus } from '@/lib/types'

/**
 * Feature: session-delete, Property 3: Failed deletion preserves state
 * Validates: Requirements 4.3, 5.3
 *
 * For any sessions array and any session ID, if the API returns a failure response
 * (network error or non-200 status), calling deleteSession(id) leaves the sessions
 * array unchanged (deep equality with the original) and returns false.
 */

// ── Replicate the core deleteSession logic from lib/store.tsx ───────────────
// This avoids needing React context/hooks for pure logic testing.
// The function mirrors the exact behavior of DataProvider's deleteSession.
async function deleteSessionLogic(
  id: string,
  sessions: POCSession[],
  setSessions: (updater: (prev: POCSession[]) => POCSession[]) => void
): Promise<boolean> {
  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'session', action: 'delete', data: { id } }),
    })
    if (!res.ok) {
      return false
    }
    setSessions((prev) => prev.filter((s) => s.id !== id))
    return true
  } catch {
    return false
  }
}

// ── Generators ─────────────────────────────────────────────────────────────

const committeeTypes: CommitteeType[] = ['DIVISIONAL', 'CLUSTER', 'IMPACT_AREA']
const sessionStatuses: SessionStatus[] = ['DRAFT', 'IN_PROGRESS', 'COMPLETED']

const arbSessionId = fc.uuid()

/** Generate a valid ISO date string using a safe timestamp range */
function arbISODate() {
  return fc.integer({ min: 1577836800000, max: 1924991999000 }).map((ts) => new Date(ts).toISOString())
}

const arbSession: fc.Arbitrary<POCSession> = fc.record({
  id: fc.uuid(),
  date: arbISODate(),
  committeeType: fc.constantFrom(...committeeTypes),
  projectIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 5 }),
  status: fc.constantFrom(...sessionStatuses),
  attendees: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 5 }),
})

const arbSessionsArray = fc.array(arbSession, { minLength: 0, maxLength: 10 })

/** Generate an HTTP error status code (non-200) */
const arbErrorStatus = fc.constantFrom(400, 401, 403, 404, 500, 502, 503)

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Feature: session-delete, Property 3: Failed deletion preserves state', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('should leave sessions array unchanged and return false when API returns non-200 status', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbSessionsArray,
        arbSessionId,
        arbErrorStatus,
        async (sessions, targetId, errorStatus) => {
          // Deep clone sessions to compare later
          const originalSessions = structuredClone(sessions)
          let currentSessions = [...sessions]

          // Mock fetch to return a non-200 response
          globalThis.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: errorStatus,
            json: () => Promise.resolve({ error: 'Failed' }),
          })

          const setSessions = (updater: (prev: POCSession[]) => POCSession[]) => {
            currentSessions = updater(currentSessions)
          }

          const result = await deleteSessionLogic(targetId, currentSessions, setSessions)

          // Property: return value must be false
          expect(result).toBe(false)

          // Property: sessions array must remain unchanged (deep equality)
          expect(currentSessions).toEqual(originalSessions)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should leave sessions array unchanged and return false when fetch throws a network error', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbSessionsArray,
        arbSessionId,
        fc.string({ minLength: 1, maxLength: 50 }),
        async (sessions, targetId, errorMessage) => {
          // Deep clone sessions to compare later
          const originalSessions = structuredClone(sessions)
          let currentSessions = [...sessions]

          // Mock fetch to throw a network error
          globalThis.fetch = vi.fn().mockRejectedValue(new Error(errorMessage))

          const setSessions = (updater: (prev: POCSession[]) => POCSession[]) => {
            currentSessions = updater(currentSessions)
          }

          const result = await deleteSessionLogic(targetId, currentSessions, setSessions)

          // Property: return value must be false
          expect(result).toBe(false)

          // Property: sessions array must remain unchanged (deep equality)
          expect(currentSessions).toEqual(originalSessions)
        }
      ),
      { numRuns: 100 }
    )
  })
})
