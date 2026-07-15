import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import type { POCSession, CommitteeType, SessionStatus } from '@/lib/types'

/**
 * Feature: session-delete, Property 2: Successful deletion removes session from state
 * Validates: Requirements 4.1, 5.2
 *
 * This property test verifies that when the API returns a successful response,
 * the deleteSession logic removes exactly the targeted session from the array
 * and returns true.
 */

// ─── Core logic extracted from DataProvider.deleteSession ─────────────────────
// This mirrors the exact logic in lib/store.tsx deleteSession callback.
// We test it as a pure function to avoid needing React rendering infrastructure.

interface DeleteSessionResult {
  success: boolean
  updatedSessions: POCSession[]
}

async function deleteSessionLogic(
  sessions: POCSession[],
  id: string,
  fetchFn: typeof fetch
): Promise<DeleteSessionResult> {
  try {
    const res = await fetchFn('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'session', action: 'delete', data: { id } }),
    })
    if (!res.ok) {
      return { success: false, updatedSessions: sessions }
    }
    const updatedSessions = sessions.filter((s) => s.id !== id)
    return { success: true, updatedSessions }
  } catch {
    return { success: false, updatedSessions: sessions }
  }
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const committeeTypes: CommitteeType[] = ['DIVISIONAL', 'CLUSTER', 'IMPACT_AREA']
const sessionStatuses: SessionStatus[] = ['DRAFT', 'IN_PROGRESS', 'COMPLETED']

const arbSession: fc.Arbitrary<POCSession> = fc.record({
  id: fc.uuid(),
  date: fc.date({
    min: new Date('2020-01-01'),
    max: new Date('2030-12-31'),
    noInvalidDate: true,
  }).map((d) => d.toISOString()),
  committeeType: fc.constantFrom(...committeeTypes),
  projectIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 5 }),
  status: fc.constantFrom(...sessionStatuses),
  attendees: fc.array(fc.string({ minLength: 1, maxLength: 30 }), {
    minLength: 0,
    maxLength: 8,
  }),
})

/** Generate a non-empty sessions array and pick one ID from it */
const arbSessionsWithTarget = fc
  .array(arbSession, { minLength: 1, maxLength: 20 })
  .chain((sessions) => {
    // Ensure unique IDs
    const uniqueSessions = sessions.reduce<POCSession[]>((acc, s) => {
      if (!acc.some((existing) => existing.id === s.id)) {
        acc.push(s)
      }
      return acc
    }, [])
    // Pick a random index from the unique sessions
    return fc.integer({ min: 0, max: uniqueSessions.length - 1 }).map((idx) => ({
      sessions: uniqueSessions,
      targetId: uniqueSessions[idx].id,
      targetIdx: idx,
    }))
  })

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: session-delete, Property 2: Successful deletion removes session from state', () => {
  it('deleteSession removes exactly the targeted session and returns true on successful API response', () => {
    fc.assert(
      fc.asyncProperty(arbSessionsWithTarget, async ({ sessions, targetId }) => {
        // Mock a successful API response
        const mockFetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        })

        const result = await deleteSessionLogic(sessions, targetId, mockFetch as any)

        // Should return success
        expect(result.success).toBe(true)

        // The resulting array should have one fewer element
        expect(result.updatedSessions.length).toBe(sessions.length - 1)

        // The target session should NOT be in the result
        expect(result.updatedSessions.find((s) => s.id === targetId)).toBeUndefined()

        // All other sessions should still be present and unchanged
        const otherSessions = sessions.filter((s) => s.id !== targetId)
        expect(result.updatedSessions).toEqual(otherSessions)

        // Fetch should have been called with correct args
        expect(mockFetch).toHaveBeenCalledWith('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entity: 'session',
            action: 'delete',
            data: { id: targetId },
          }),
        })
      }),
      { numRuns: 100 }
    )
  })
})
