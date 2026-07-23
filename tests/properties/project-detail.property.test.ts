/**
 * Property Test: Project detail includes all related entities
 *
 * Feature: paginated-data-loading
 * Property 4: Project detail includes all related entities
 *
 * **Validates: Requirements 3.1**
 *
 * For any project ID that exists in the database, the project detail response
 * SHALL include the project record and all of its related actions, reviews
 * (with checklist responses), risks, and KDA decisions — with no entities
 * belonging to other projects included.
 */
import { describe, it, expect } from "vitest"
import * as fc from "fast-check"
import { assembleProjectDetail } from "@/lib/project-detail-assembly"
import type {
  Project,
  Action,
  POCReview,
  RiskIssue,
  KDADecision,
  ChecklistItem,
} from "@/lib/types"

// ─── Generators ────────────────────────────────────────────────────────────────

// Generate valid ISO date strings using integer timestamps in a safe range
const isoDateStringArb = fc
  .integer({ min: 946684800000, max: 1924905600000 }) // 2000-01-01 to 2030-12-31
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

// ─── Property Test ─────────────────────────────────────────────────────────────

describe("Feature: paginated-data-loading | Property 4: Project detail includes all related entities", () => {
  /**
   * **Validates: Requirements 3.1**
   */
  it("should include ALL related entities for the target project and NONE from other projects", () => {
    fc.assert(
      fc.property(
        // Generate 2-4 distinct project IDs to simulate a multi-project database
        fc
          .uniqueArray(fc.uuid(), { minLength: 2, maxLength: 4 })
          .chain((projectIds) => {
            const targetId = projectIds[0]
            const otherIds = projectIds.slice(1)

            return fc.tuple(
              // Target project
              projectArb(targetId),
              // Actions for target project
              fc.array(actionArb(targetId), { minLength: 0, maxLength: 5 }),
              // Actions for other projects (one array per other project)
              fc.tuple(
                ...otherIds.map((oid) => fc.array(actionArb(oid), { minLength: 0, maxLength: 3 }))
              ),
              // Reviews for target project (with checklist responses)
              fc.array(reviewArb(targetId), { minLength: 0, maxLength: 3 }),
              // Reviews for other projects
              fc.tuple(
                ...otherIds.map((oid) => fc.array(reviewArb(oid), { minLength: 0, maxLength: 2 }))
              ),
              // Risks for target project
              fc.array(riskArb(targetId), { minLength: 0, maxLength: 4 }),
              // Risks for other projects
              fc.tuple(
                ...otherIds.map((oid) => fc.array(riskArb(oid), { minLength: 0, maxLength: 2 }))
              ),
              // KDA decisions for target project
              fc.array(kdaDecisionArb(targetId), { minLength: 0, maxLength: 3 }),
              // KDA decisions for other projects
              fc.tuple(
                ...otherIds.map((oid) => fc.array(kdaDecisionArb(oid), { minLength: 0, maxLength: 2 }))
              )
            )
          }),
        (data) => {
          const [
            targetProject,
            targetActions,
            otherActionsArrays,
            targetReviews,
            otherReviewsArrays,
            targetRisks,
            otherRisksArrays,
            targetKdaDecisions,
            otherKdaArrays,
          ] = data

          // Combine all entities into "database" arrays
          const allActions = [...targetActions, ...(otherActionsArrays as Action[][]).flat()]
          const allReviews = [...targetReviews, ...(otherReviewsArrays as POCReview[][]).flat()]
          const allRisks = [...targetRisks, ...(otherRisksArrays as RiskIssue[][]).flat()]
          const allKdaDecisions = [
            ...targetKdaDecisions,
            ...(otherKdaArrays as KDADecision[][]).flat(),
          ]

          // Execute the assembly function
          const result = assembleProjectDetail(
            targetProject,
            allActions,
            allReviews,
            allRisks,
            allKdaDecisions
          )

          // ─── Assertion 1: Project record is included correctly ───
          expect(result.project).toEqual(targetProject)

          // ─── Assertion 2: All target project's actions are included ───
          expect(result.actions).toHaveLength(targetActions.length)
          for (const action of targetActions) {
            expect(result.actions).toContainEqual(action)
          }

          // ─── Assertion 3: All target project's reviews (with checklists) are included ───
          expect(result.reviews).toHaveLength(targetReviews.length)
          for (const review of targetReviews) {
            expect(result.reviews).toContainEqual(review)
            // Verify checklist responses are preserved
            const found = result.reviews.find((r) => r.id === review.id)
            expect(found?.checklistResponses).toEqual(review.checklistResponses)
          }

          // ─── Assertion 4: All target project's risks are included ───
          expect(result.risks).toHaveLength(targetRisks.length)
          for (const risk of targetRisks) {
            expect(result.risks).toContainEqual(risk)
          }

          // ─── Assertion 5: All target project's KDA decisions are included ───
          expect(result.kdaDecisions).toHaveLength(targetKdaDecisions.length)
          for (const kda of targetKdaDecisions) {
            expect(result.kdaDecisions).toContainEqual(kda)
          }

          // ─── Assertion 6: No entities from other projects are included ───
          for (const action of result.actions) {
            expect(action.projectId).toBe(targetProject.id)
          }
          for (const review of result.reviews) {
            expect(review.projectId).toBe(targetProject.id)
          }
          for (const risk of result.risks) {
            expect(risk.projectId).toBe(targetProject.id)
          }
          for (const kda of result.kdaDecisions) {
            expect(kda.projectId).toBe(targetProject.id)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
