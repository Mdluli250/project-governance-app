/**
 * Property Test: Local cache update after mutation
 *
 * Feature: paginated-data-loading
 * Property 14: Local cache update after mutation
 *
 * **Validates: Requirements 8.2**
 *
 * For any successful entity mutation (create or update), the locally cached data
 * for that entity SHALL reflect the mutation immediately without requiring a full
 * page reload or refetch.
 */
import { describe, it, expect } from "vitest"
import * as fc from "fast-check"
import {
  updateCachedProjectDetail,
  updateCachedAction,
  updateCachedProjectFields,
  updateCachedRisk,
  updateCachedKDADecision,
  updateCachedReview,
} from "@/lib/cache-utils"
import type { ProjectDetailResponse } from "@/lib/api-types"
import type {
  Project,
  Action,
  RiskIssue,
  KDADecision,
  POCReview,
  ChecklistItem,
} from "@/lib/types"

// ─── Generators ────────────────────────────────────────────────────────────────

const isoDateStringArb = fc
  .integer({ min: 946684800000, max: 1924905600000 })
  .map((ts) => new Date(ts).toISOString())

const ragStatusArb = fc.constantFrom("RED" as const, "AMBER" as const, "GREEN" as const)

const ragDimensionsArb = fc.record({
  overall: ragStatusArb,
  scope: ragStatusArb,
  schedule: ragStatusArb,
  cost: ragStatusArb,
  quality: ragStatusArb,
  risk: ragStatusArb,
  sheq: ragStatusArb,
  data: ragStatusArb,
  compliance: ragStatusArb,
})

const classificationArb = fc.constantFrom("A" as const, "B" as const, "C" as const)

const projectArb = (id: string): fc.Arbitrary<Project> =>
  fc.record({
    id: fc.constant(id),
    shortTitle: fc.string({ minLength: 1, maxLength: 30 }),
    longTitle: fc.string({ minLength: 1, maxLength: 100 }),
    classification: classificationArb,
    cluster: fc.string({ minLength: 1, maxLength: 20 }),
    impactArea: fc.string({ minLength: 1, maxLength: 20 }),
    pmId: fc.uuid(),
    sponsorName: fc.string({ minLength: 1, maxLength: 30 }),
    strategicObjectives: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 5 }),
    contractValue: fc.nat({ max: 10000000 }),
    contractTerm: fc.nat({ max: 120 }),
    startDate: isoDateStringArb,
    endDate: isoDateStringArb,
    thisYearAmount: fc.nat({ max: 5000000 }),
    riskComplexity: fc.constantFrom("LOW" as const, "MEDIUM" as const, "HIGH" as const),
    reputationalRisk: fc.constantFrom("LOW" as const, "MEDIUM" as const, "HIGH" as const),
    rag: ragDimensionsArb,
    healthNarrative: fc.string({ maxLength: 200 }),
    lastUpdated: isoDateStringArb,
  })

const actionArb = (projectId: string): fc.Arbitrary<Action> =>
  fc.record({
    id: fc.uuid(),
    projectId: fc.constant(projectId),
    reviewId: fc.option(fc.uuid(), { nil: undefined }),
    description: fc.string({ minLength: 1, maxLength: 100 }),
    owner: fc.string({ minLength: 1, maxLength: 30 }),
    dueDate: isoDateStringArb,
    status: fc.constantFrom("OPEN" as const, "IN_PROGRESS" as const, "CLOSED" as const),
    category: fc.constantFrom(
      "GOVERNANCE" as const,
      "RISK" as const,
      "SHEQ" as const,
      "COMPLIANCE" as const,
      "DATA" as const,
      "CONTRACT" as const,
      "SCHEDULE" as const,
      "FINANCE" as const
    ),
    evidenceLinks: fc.array(fc.webUrl(), { maxLength: 3 }),
  })

const checklistItemArb: fc.Arbitrary<ChecklistItem> = fc.record({
  id: fc.uuid(),
  section: fc.string({ minLength: 1, maxLength: 30 }),
  item: fc.string({ minLength: 1, maxLength: 100 }),
  response: fc.constantFrom("YES" as const, "NO" as const, "PARTIAL" as const, null),
  comment: fc.string({ maxLength: 100 }),
  evidenceLinks: fc.array(fc.webUrl(), { maxLength: 2 }),
  actionRequired: fc.boolean(),
})

const reviewArb = (projectId: string): fc.Arbitrary<POCReview> =>
  fc.record({
    id: fc.uuid(),
    projectId: fc.constant(projectId),
    reviewDate: isoDateStringArb,
    committeeType: fc.constantFrom("DIVISIONAL" as const, "CLUSTER" as const, "IMPACT_AREA" as const),
    attendees: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 5 }),
    checklistResponses: fc.array(checklistItemArb, { minLength: 0, maxLength: 5 }),
    findingsSummary: fc.string({ maxLength: 200 }),
    escalation: fc.boolean(),
    outcome: fc.constantFrom(
      "APPROVED" as const,
      "APPROVED_WITH_ACTIONS" as const,
      "REJECTED" as const,
      "DEFERRED" as const
    ),
  })

const riskArb = (projectId: string): fc.Arbitrary<RiskIssue> =>
  fc.record({
    id: fc.uuid(),
    projectId: fc.constant(projectId),
    title: fc.string({ minLength: 1, maxLength: 50 }),
    type: fc.constantFrom("RISK" as const, "ISSUE" as const),
    likelihood: fc.constantFrom("LOW" as const, "MEDIUM" as const, "HIGH" as const),
    impact: fc.constantFrom("LOW" as const, "MEDIUM" as const, "HIGH" as const),
    ragStatus: ragStatusArb,
    mitigation: fc.string({ maxLength: 200 }),
    owner: fc.string({ minLength: 1, maxLength: 30 }),
    status: fc.constantFrom("OPEN" as const, "MITIGATED" as const, "CLOSED" as const),
  })

const kdaDecisionArb = (projectId: string): fc.Arbitrary<KDADecision> =>
  fc.record({
    id: fc.uuid(),
    projectId: fc.constant(projectId),
    gateName: fc.string({ minLength: 1, maxLength: 30 }),
    stage: fc.string({ minLength: 1, maxLength: 30 }),
    submissionStatus: fc.string({ minLength: 1, maxLength: 30 }),
    decision: fc.constantFrom("APPROVED" as const, "REJECTED" as const, "EXCEPTION_REQUIRED" as const),
    notes: fc.string({ maxLength: 200 }),
    signedOffBy: fc.string({ minLength: 1, maxLength: 30 }),
    date: isoDateStringArb,
  })

/** Generate a ProjectDetailResponse for a given project ID */
const projectDetailArb = (projectId: string): fc.Arbitrary<ProjectDetailResponse> =>
  fc.record({
    project: projectArb(projectId),
    actions: fc.array(actionArb(projectId), { minLength: 0, maxLength: 5 }),
    reviews: fc.array(reviewArb(projectId), { minLength: 0, maxLength: 3 }),
    risks: fc.array(riskArb(projectId), { minLength: 0, maxLength: 4 }),
    kdaDecisions: fc.array(kdaDecisionArb(projectId), { minLength: 0, maxLength: 3 }),
  })

// ─── Property Tests ────────────────────────────────────────────────────────────

describe("Feature: paginated-data-loading | Property 14: Local cache update after mutation", () => {
  /**
   * **Validates: Requirements 8.2**
   *
   * After adding an action to a cached project, the project's actions include the new action.
   */
  it("after adding an action to a cached project, the project's actions include the new action", () => {
    fc.assert(
      fc.property(
        fc.uuid().chain((projectId) =>
          fc.tuple(
            fc.constant(projectId),
            projectDetailArb(projectId),
            actionArb(projectId)
          )
        ),
        ([projectId, detail, newAction]) => {
          // Set up cache with one project
          const cache = new Map<string, ProjectDetailResponse>()
          cache.set(projectId, detail)

          // Apply mutation: add action
          const updatedCache = updateCachedAction(cache, projectId, newAction)

          // The cached data should reflect the mutation immediately
          const updatedDetail = updatedCache.get(projectId)!
          expect(updatedDetail.actions).toContainEqual(newAction)
          // The count should be original + 1 (since action ID is unique via uuid)
          expect(updatedDetail.actions.length).toBe(detail.actions.length + 1)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Validates: Requirements 8.2**
   *
   * After updating a project field in cache, the field reflects the new value.
   */
  it("after updating a project field in cache, the field reflects the new value", () => {
    fc.assert(
      fc.property(
        fc.uuid().chain((projectId) =>
          fc.tuple(
            fc.constant(projectId),
            projectDetailArb(projectId),
            fc.string({ minLength: 1, maxLength: 50 }),
            classificationArb,
            fc.nat({ max: 10000000 })
          )
        ),
        ([projectId, detail, newTitle, newClassification, newContractValue]) => {
          const cache = new Map<string, ProjectDetailResponse>()
          cache.set(projectId, detail)

          // Apply mutation: update project fields
          const updatedCache = updateCachedProjectFields(cache, projectId, {
            shortTitle: newTitle,
            classification: newClassification,
            contractValue: newContractValue,
          })

          const updatedDetail = updatedCache.get(projectId)!
          expect(updatedDetail.project.shortTitle).toBe(newTitle)
          expect(updatedDetail.project.classification).toBe(newClassification)
          expect(updatedDetail.project.contractValue).toBe(newContractValue)
          // Other fields should remain unchanged
          expect(updatedDetail.project.id).toBe(projectId)
          expect(updatedDetail.project.longTitle).toBe(detail.project.longTitle)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Validates: Requirements 8.2**
   *
   * The cache update does NOT affect other project entries.
   */
  it("cache update does NOT affect other project entries", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.uuid(), { minLength: 2, maxLength: 4 }).chain((projectIds) => {
          const targetId = projectIds[0]
          const otherIds = projectIds.slice(1)
          return fc.tuple(
            fc.constant(targetId),
            fc.constant(otherIds),
            projectDetailArb(targetId),
            // Generate details for other projects
            fc.tuple(...otherIds.map((id) => projectDetailArb(id))),
            actionArb(targetId)
          )
        }),
        ([targetId, otherIds, targetDetail, otherDetails, newAction]) => {
          // Set up cache with multiple projects
          const cache = new Map<string, ProjectDetailResponse>()
          cache.set(targetId, targetDetail)
          ;(otherIds as string[]).forEach((id, i) => {
            cache.set(id, (otherDetails as ProjectDetailResponse[])[i])
          })

          // Apply mutation only to target project
          const updatedCache = updateCachedAction(cache, targetId, newAction)

          // Other projects should remain completely unchanged
          for (let i = 0; i < (otherIds as string[]).length; i++) {
            const otherId = (otherIds as string[])[i]
            const original = (otherDetails as ProjectDetailResponse[])[i]
            const afterUpdate = updatedCache.get(otherId)!
            expect(afterUpdate).toEqual(original)
          }

          // Target was updated
          const updatedTarget = updatedCache.get(targetId)!
          expect(updatedTarget.actions).toContainEqual(newAction)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Validates: Requirements 8.2**
   *
   * For any mutation type (action, risk, KDA, review, project field update),
   * the cache reflects the change immediately without needing a refetch.
   * Generates random projects, actions, and updates to prove universality.
   */
  it("any entity mutation type reflects immediately in the cache (universality)", () => {
    fc.assert(
      fc.property(
        fc.uuid().chain((projectId) =>
          fc.tuple(
            fc.constant(projectId),
            projectDetailArb(projectId),
            actionArb(projectId),
            riskArb(projectId),
            kdaDecisionArb(projectId),
            reviewArb(projectId),
            fc.string({ minLength: 1, maxLength: 50 }) // new shortTitle
          )
        ),
        ([projectId, detail, newAction, newRisk, newKda, newReview, newTitle]) => {
          const cache = new Map<string, ProjectDetailResponse>()
          cache.set(projectId, detail)

          // Apply all mutation types sequentially
          let updatedCache = updateCachedAction(cache, projectId, newAction)
          updatedCache = updateCachedRisk(updatedCache, projectId, newRisk)
          updatedCache = updateCachedKDADecision(updatedCache, projectId, newKda)
          updatedCache = updateCachedReview(updatedCache, projectId, newReview)
          updatedCache = updateCachedProjectFields(updatedCache, projectId, { shortTitle: newTitle })

          const finalDetail = updatedCache.get(projectId)!

          // All mutations are reflected
          expect(finalDetail.actions).toContainEqual(newAction)
          expect(finalDetail.risks).toContainEqual(newRisk)
          expect(finalDetail.kdaDecisions).toContainEqual(newKda)
          expect(finalDetail.reviews).toContainEqual(newReview)
          expect(finalDetail.project.shortTitle).toBe(newTitle)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Validates: Requirements 8.2**
   *
   * updateCachedAction with an existing action ID replaces the action (update scenario).
   */
  it("updating an existing action replaces it in the cache", () => {
    fc.assert(
      fc.property(
        fc.uuid().chain((projectId) =>
          fc.tuple(
            fc.constant(projectId),
            projectDetailArb(projectId).filter((d) => d.actions.length > 0)
          ).chain(([pId, detail]) => {
            // Pick one existing action to update
            const existingAction = detail.actions[0]
            return fc.tuple(
              fc.constant(pId),
              fc.constant(detail),
              // Generate updated version of the same action (same id)
              fc.record({
                id: fc.constant(existingAction.id),
                projectId: fc.constant(pId),
                reviewId: fc.option(fc.uuid(), { nil: undefined }),
                description: fc.string({ minLength: 1, maxLength: 100 }),
                owner: fc.string({ minLength: 1, maxLength: 30 }),
                dueDate: isoDateStringArb,
                status: fc.constantFrom("OPEN" as const, "IN_PROGRESS" as const, "CLOSED" as const),
                category: fc.constantFrom(
                  "GOVERNANCE" as const,
                  "RISK" as const,
                  "SHEQ" as const,
                  "COMPLIANCE" as const,
                  "DATA" as const,
                  "CONTRACT" as const,
                  "SCHEDULE" as const,
                  "FINANCE" as const
                ),
                evidenceLinks: fc.array(fc.webUrl(), { maxLength: 3 }),
              })
            )
          })
        ),
        ([projectId, detail, updatedAction]) => {
          const cache = new Map<string, ProjectDetailResponse>()
          cache.set(projectId, detail)

          const updatedCache = updateCachedAction(cache, projectId, updatedAction)
          const updatedDetail = updatedCache.get(projectId)!

          // Count should remain the same (replaced, not appended)
          expect(updatedDetail.actions.length).toBe(detail.actions.length)
          // The updated action is present
          expect(updatedDetail.actions).toContainEqual(updatedAction)
          // The old version of the action is gone
          const oldAction = detail.actions[0]
          if (oldAction.description !== updatedAction.description) {
            expect(updatedDetail.actions).not.toContainEqual(oldAction)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
