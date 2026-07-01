/**
 * Preservation Property Tests
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11**
 *
 * These tests capture the BASELINE behavior of the application on UNFIXED code.
 * They verify that non-buggy operations (valid data, correct inputs) work correctly.
 * After bug fixes are applied, these tests must STILL PASS to confirm no regressions.
 *
 * EXPECTED OUTCOME: All tests PASS on unfixed code.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import * as fc from 'fast-check'
import jwt from 'jsonwebtoken'

// ─── Helpers ───────────────────────────────────────────────────────────────────

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-for-testing-only'

// Generate a valid JWT token for authenticated requests
function generateAuthToken(): string {
  return jwt.sign(
    { sub: 'test-user', email: 'test@example.com', role: 'ADMIN' },
    JWT_SECRET,
    { expiresIn: '1h' }
  )
}

const AUTH_TOKEN = generateAuthToken()
const AUTH_HEADERS = {
  'Authorization': `Bearer ${AUTH_TOKEN}`,
}

async function fetchAPI(urlPath: string, options?: RequestInit) {
  return fetch(`${BASE_URL}${urlPath}`, options)
}

async function fetchAPIAuth(urlPath: string, options?: RequestInit) {
  const headers = {
    ...AUTH_HEADERS,
    ...(options?.headers || {}),
  }
  return fetch(`${BASE_URL}${urlPath}`, { ...options, headers })
}

// ─── Setup: ensure a test user has a known password ────────────────────────────

let testUserEmail: string
let testUserPassword: string
let testUserId: string

beforeAll(async () => {
  // Get the list of users to find one we can use for login tests
  const usersRes = await fetchAPIAuth('/api/users')
  const users = await usersRes.json() as { id: string; name: string; email: string }[]

  // Pick a user to set up with a known password
  const targetUser = users.find(u => u.name === 'Amara Osei') || users[0]
  testUserId = targetUser.id
  testUserEmail = targetUser.email
  testUserPassword = 'TestPassword123!'

  // Set a known password on this user via PATCH (resetToDefault then change)
  // First, set a known password using PATCH with newPassword
  await fetchAPIAuth('/api/users', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
    body: JSON.stringify({ id: testUserId, newPassword: testUserPassword }),
  })
})

// ─── Property: Authenticated GET /api/data returns expected data shapes ────────

describe('Preservation: GET /api/data returns expected shape', () => {
  /**
   * **Validates: Requirements 3.1, 3.11**
   *
   * Property: GET /api/data always returns an object with keys:
   * projects, actions, reviews, risks, auditLog, kdaDecisions, sessions
   * where each is an array.
   */
  it('Property: GET /api/data returns all expected top-level keys as arrays', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const res = await fetchAPIAuth('/api/data')
        expect(res.status).toBe(200)

        const json = await res.json()
        expect(json).toHaveProperty('projects')
        expect(json).toHaveProperty('actions')
        expect(json).toHaveProperty('reviews')
        expect(json).toHaveProperty('risks')
        expect(json).toHaveProperty('auditLog')
        expect(json).toHaveProperty('kdaDecisions')
        expect(json).toHaveProperty('sessions')

        expect(Array.isArray(json.projects)).toBe(true)
        expect(Array.isArray(json.actions)).toBe(true)
        expect(Array.isArray(json.reviews)).toBe(true)
        expect(Array.isArray(json.risks)).toBe(true)
        expect(Array.isArray(json.auditLog)).toBe(true)
        expect(Array.isArray(json.kdaDecisions)).toBe(true)
        expect(Array.isArray(json.sessions)).toBe(true)

        return true
      }),
      { numRuns: 1 }
    )
  })

  it('Property: each project in GET /api/data has required fields', async () => {
    const res = await fetchAPIAuth('/api/data')
    const json = await res.json()

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...(json.projects.length > 0 ? json.projects : [null])),
        async (project: Record<string, unknown> | null) => {
          if (!project) return true

          // Project shape must include these keys
          expect(project).toHaveProperty('id')
          expect(project).toHaveProperty('shortTitle')
          expect(project).toHaveProperty('longTitle')
          expect(project).toHaveProperty('classification')
          expect(project).toHaveProperty('cluster')
          expect(project).toHaveProperty('impactArea')
          expect(project).toHaveProperty('pmId')
          expect(project).toHaveProperty('sponsorName')
          expect(project).toHaveProperty('strategicObjectives')
          expect(project).toHaveProperty('contractValue')
          expect(project).toHaveProperty('contractTerm')
          expect(project).toHaveProperty('rag')
          expect(project).toHaveProperty('riskComplexity')
          expect(project).toHaveProperty('reputationalRisk')

          // Rag must be an object with all dimensions
          const rag = project.rag as Record<string, string>
          expect(rag).toHaveProperty('overall')
          expect(rag).toHaveProperty('scope')
          expect(rag).toHaveProperty('schedule')
          expect(rag).toHaveProperty('cost')
          expect(rag).toHaveProperty('quality')
          expect(rag).toHaveProperty('risk')
          expect(rag).toHaveProperty('sheq')
          expect(rag).toHaveProperty('data')
          expect(rag).toHaveProperty('compliance')

          return true
        }
      ),
      { numRuns: json.projects.length || 1 }
    )
  })
})

// ─── Property: GET /api/config returns expected config shape ───────────────────

describe('Preservation: GET /api/config returns expected shape', () => {
  /**
   * **Validates: Requirements 3.10**
   *
   * Property: GET /api/config always returns an object with keys:
   * clusters, impactAreas, strategicObjectives, checklistTemplate, actionCategories
   */
  it('Property: GET /api/config returns all expected config sections', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const res = await fetchAPIAuth('/api/config')
        expect(res.status).toBe(200)

        const json = await res.json()
        expect(json).toHaveProperty('clusters')
        expect(json).toHaveProperty('impactAreas')
        expect(json).toHaveProperty('strategicObjectives')
        expect(json).toHaveProperty('checklistTemplate')
        expect(json).toHaveProperty('actionCategories')

        expect(Array.isArray(json.clusters)).toBe(true)
        expect(typeof json.impactAreas).toBe('object')
        expect(Array.isArray(json.strategicObjectives)).toBe(true)
        expect(Array.isArray(json.checklistTemplate)).toBe(true)
        expect(Array.isArray(json.actionCategories)).toBe(true)

        return true
      }),
      { numRuns: 1 }
    )
  })

  it('Property: strategicObjectives items have id, label, description', async () => {
    const res = await fetchAPIAuth('/api/config')
    const json = await res.json()

    if (json.strategicObjectives.length === 0) return

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...json.strategicObjectives),
        async (obj: Record<string, unknown>) => {
          expect(obj).toHaveProperty('id')
          expect(obj).toHaveProperty('label')
          expect(obj).toHaveProperty('description')
          return true
        }
      ),
      { numRuns: json.strategicObjectives.length }
    )
  })

  it('Property: actionCategories items have value and label', async () => {
    const res = await fetchAPIAuth('/api/config')
    const json = await res.json()

    if (json.actionCategories.length === 0) return

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...json.actionCategories),
        async (cat: Record<string, unknown>) => {
          expect(cat).toHaveProperty('value')
          expect(cat).toHaveProperty('label')
          expect(typeof cat.value).toBe('string')
          expect(typeof cat.label).toBe('string')
          return true
        }
      ),
      { numRuns: json.actionCategories.length }
    )
  })
})

// ─── Property: GET /api/users returns array of user profiles ordered by name ───

describe('Preservation: GET /api/users returns user profiles', () => {
  /**
   * **Validates: Requirements 3.1**
   *
   * Property: GET /api/users returns an array of user profiles
   * each containing id, name, email, role fields.
   */
  it('Property: GET /api/users returns array of user objects with required fields', async () => {
    const res = await fetchAPIAuth('/api/users')
    expect(res.status).toBe(200)

    const users = await res.json()
    expect(Array.isArray(users)).toBe(true)
    expect(users.length).toBeGreaterThan(0)

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...users),
        async (user: Record<string, unknown>) => {
          expect(user).toHaveProperty('id')
          expect(user).toHaveProperty('name')
          expect(user).toHaveProperty('email')
          expect(user).toHaveProperty('role')
          expect(typeof user.id).toBe('string')
          expect(typeof user.name).toBe('string')
          expect(typeof user.email).toBe('string')
          expect(typeof user.role).toBe('string')
          return true
        }
      ),
      { numRuns: users.length }
    )
  })

  it('Property: users are ordered by name ascending', async () => {
    const res = await fetchAPIAuth('/api/users')
    const users = await res.json() as { name: string }[]

    for (let i = 1; i < users.length; i++) {
      expect(users[i].name.localeCompare(users[i - 1].name)).toBeGreaterThanOrEqual(0)
    }
  })
})

// ─── Property: POST /api/auth/login with valid credentials returns user ────────

describe('Preservation: POST /api/auth/login with valid credentials', () => {
  /**
   * **Validates: Requirements 3.2, 3.3**
   *
   * Property: For any valid login credentials, the API returns { user: {...} }
   * with id, name, email, role fields.
   *
   * NOTE: The login endpoint does NOT require JWT auth (it's the login route).
   * After the hardcoded password removal fix, only users with proper bcrypt
   * password hashes can login. We set up a test user with a known password
   * in beforeAll.
   */
  it('Property: valid login returns user object with expected shape', async () => {
    const res = await fetchAPI('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUserEmail, password: testUserPassword }),
    })

    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json).toHaveProperty('user')
    expect(json.user).toHaveProperty('id')
    expect(json.user).toHaveProperty('name')
    expect(json.user).toHaveProperty('email')
    expect(json.user).toHaveProperty('role')
    expect(typeof json.user.id).toBe('string')
    expect(typeof json.user.name).toBe('string')
    expect(typeof json.user.email).toBe('string')
    expect(typeof json.user.role).toBe('string')
  })

  it('Property: login with passwordChanged=true does NOT require forced change', async () => {
    /**
     * **Validates: Requirements 3.6**
     *
     * We verify that when a user has passwordChanged=true in the DB, the login
     * response includes passwordChanged=true, which in the client store means
     * setMustChangePassword(false) is called (user goes to dashboard).
     *
     * The test user was set up via PATCH with newPassword which sets passwordChanged=true.
     */
    const res = await fetchAPI('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUserEmail, password: testUserPassword }),
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.user).toHaveProperty('passwordChanged')
    // The value should be a boolean
    expect(typeof json.user.passwordChanged).toBe('boolean')
    // Since we set the password via PATCH (not resetToDefault), passwordChanged should be true
    expect(json.user.passwordChanged).toBe(true)
  })
})

// ─── Property: POST /api/data with valid data succeeds ─────────────────────────

describe('Preservation: POST /api/data with valid entity/action/data succeeds', () => {
  /**
   * **Validates: Requirements 3.5, 3.11**
   *
   * Property: For all valid entity/action combinations with required fields present,
   * persist operations succeed with { success: true }.
   */
  it('Property: valid project upsert succeeds', async () => {
    // Get existing projects to find a valid pmId
    const dataRes = await fetchAPIAuth('/api/data')
    const allData = await dataRes.json()
    const existingProject = allData.projects[0]

    if (!existingProject) return // skip if no data

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('GREEN', 'AMBER', 'RED'),
        async (ragValue) => {
          // Upsert existing project with a valid RAG change
          const payload = {
            entity: 'project',
            action: 'upsert',
            data: {
              id: existingProject.id,
              shortTitle: existingProject.shortTitle,
              longTitle: existingProject.longTitle,
              classification: existingProject.classification,
              cluster: existingProject.cluster,
              impactArea: existingProject.impactArea,
              pmId: existingProject.pmId,
              sponsorName: existingProject.sponsorName,
              strategicObjectives: existingProject.strategicObjectives,
              contractValue: existingProject.contractValue,
              contractTerm: existingProject.contractTerm,
              startDate: existingProject.startDate || null,
              endDate: existingProject.endDate || null,
              thisYearAmount: existingProject.thisYearAmount,
              riskComplexity: existingProject.riskComplexity,
              reputationalRisk: existingProject.reputationalRisk,
              healthNarrative: existingProject.healthNarrative,
              lastUpdated: new Date().toISOString().split('T')[0],
              rag: {
                overall: ragValue,
                scope: existingProject.rag.scope,
                schedule: existingProject.rag.schedule,
                cost: existingProject.rag.cost,
                quality: existingProject.rag.quality,
                risk: existingProject.rag.risk,
                sheq: existingProject.rag.sheq,
                data: existingProject.rag.data,
                compliance: existingProject.rag.compliance,
              },
            },
          }

          const res = await fetchAPIAuth('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
            body: JSON.stringify(payload),
          })

          expect(res.status).toBe(200)
          const json = await res.json()
          expect(json).toHaveProperty('success', true)
          return true
        }
      ),
      { numRuns: 3 }
    )
  })

  it('Property: valid enum values for RAG are accepted in project upserts', async () => {
    /**
     * **Validates: Requirements 3.4**
     *
     * For all valid RAG enum values ('GREEN', 'AMBER', 'RED'),
     * the database accepts and persists correctly.
     */
    const dataRes = await fetchAPIAuth('/api/data')
    const allData = await dataRes.json()
    const existingProject = allData.projects[0]

    if (!existingProject) return

    const validRagValues = ['GREEN', 'AMBER', 'RED']

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...validRagValues),
        fc.constantFrom(...validRagValues),
        async (overallRag, scopeRag) => {
          const payload = {
            entity: 'project',
            action: 'upsert',
            data: {
              id: existingProject.id,
              shortTitle: existingProject.shortTitle,
              longTitle: existingProject.longTitle,
              classification: existingProject.classification,
              cluster: existingProject.cluster,
              impactArea: existingProject.impactArea,
              pmId: existingProject.pmId,
              sponsorName: existingProject.sponsorName,
              strategicObjectives: existingProject.strategicObjectives,
              contractValue: existingProject.contractValue,
              contractTerm: existingProject.contractTerm,
              startDate: existingProject.startDate || null,
              endDate: existingProject.endDate || null,
              thisYearAmount: existingProject.thisYearAmount,
              riskComplexity: existingProject.riskComplexity,
              reputationalRisk: existingProject.reputationalRisk,
              healthNarrative: existingProject.healthNarrative,
              lastUpdated: new Date().toISOString().split('T')[0],
              rag: {
                overall: overallRag,
                scope: scopeRag,
                schedule: existingProject.rag.schedule,
                cost: existingProject.rag.cost,
                quality: existingProject.rag.quality,
                risk: existingProject.rag.risk,
                sheq: existingProject.rag.sheq,
                data: existingProject.rag.data,
                compliance: existingProject.rag.compliance,
              },
            },
          }

          const res = await fetchAPIAuth('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
            body: JSON.stringify(payload),
          })

          expect(res.status).toBe(200)
          const json = await res.json()
          expect(json).toHaveProperty('success', true)
          return true
        }
      ),
      { numRuns: 5 }
    )
  })
})

// ─── Property: PATCH /api/users with valid password change succeeds ────────────

describe('Preservation: PATCH /api/users password change', () => {
  /**
   * **Validates: Requirements 3.7**
   *
   * Property: PATCH /api/users with valid id and newPassword (8+ chars)
   * returns { success: true } and sets passwordChanged: true.
   */
  it('Property: valid password change returns success', async () => {
    // Get a user to test with
    const usersRes = await fetchAPIAuth('/api/users')
    const users = await usersRes.json() as { id: string; name: string }[]

    // Use a specific test user
    const patchTestUser = users.find(u => u.name === 'Amara Osei') || users[0]
    if (!patchTestUser) return

    await fc.assert(
      fc.asyncProperty(
        // Generate passwords that are at least 8 characters
        fc.string({ minLength: 8, maxLength: 20 }).filter(s => s.length >= 8 && s !== '12345678'),
        async (newPassword) => {
          const res = await fetchAPIAuth('/api/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
            body: JSON.stringify({ id: patchTestUser.id, newPassword }),
          })

          expect(res.status).toBe(200)
          const json = await res.json()
          expect(json).toHaveProperty('success', true)
          return true
        }
      ),
      { numRuns: 3 }
    )

    // Reset password back to our known test password so other tests aren't affected
    await fetchAPIAuth('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
      body: JSON.stringify({ id: patchTestUser.id, newPassword: testUserPassword }),
    })
  })
})

// ─── Property: DELETE /api/users for user with NO dependent projects succeeds ──

describe('Preservation: DELETE /api/users for user without dependencies', () => {
  /**
   * **Validates: Requirements 3.8**
   *
   * Property: For all profile deletions where no FK constraints exist,
   * deletion succeeds with { success: true }.
   */
  it('Property: delete user with no dependent projects succeeds', async () => {
    // Create a temporary user for deletion test
    const createRes = await fetchAPIAuth('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
      body: JSON.stringify({
        name: 'Temp Delete Test',
        email: `temp-delete-test-${Date.now()}@test.com`,
        role: 'PM',
      }),
    })

    expect(createRes.status).toBe(200)
    const createdUser = await createRes.json()
    expect(createdUser).toHaveProperty('id')

    // Delete the user (no projects assigned)
    const deleteRes = await fetchAPIAuth(`/api/users?id=${createdUser.id}`, {
      method: 'DELETE',
    })

    expect(deleteRes.status).toBe(200)
    const deleteJson = await deleteRes.json()
    expect(deleteJson).toHaveProperty('success', true)
  })
})

// ─── Property: Prisma client uses PrismaPg adapter with pg pool ────────────────

describe('Preservation: Prisma client configuration', () => {
  /**
   * **Validates: Requirements 3.9**
   *
   * Property: The Prisma client is configured with PrismaPg adapter and pg Pool.
   */
  it('lib/prisma.ts uses PrismaPg adapter with pg Pool', async () => {
    const fs = await import('fs')
    const path = await import('path')

    const prismaCode = fs.readFileSync(
      path.resolve(__dirname, '..', 'lib', 'prisma.ts'),
      'utf-8'
    )

    // Must use PrismaPg adapter
    expect(prismaCode).toContain('PrismaPg')
    expect(prismaCode).toContain('Pool')
    expect(prismaCode).toContain('@prisma/adapter-pg')
    expect(prismaCode).toContain("from 'pg'")
  })
})
