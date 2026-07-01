import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { mapReview } from '@/lib/prisma-mappers'
import type { ReviewRow } from '@/lib/prisma-mappers'
import type { CommitteeType, ReviewOutcome, ChecklistResponse } from '@prisma/client'

/**
 * Feature: prisma-migration, Property 4: Review mapping includes all checklist responses
 * Validates: Requirements 9.1, 9.2
 */

const committeeTypes: CommitteeType[] = ['DIVISIONAL', 'CLUSTER', 'IMPACT_AREA']
const reviewOutcomes: ReviewOutcome[] = ['APPROVED', 'APPROVED_WITH_ACTIONS', 'REJECTED', 'DEFERRED']
const checklistResponseValues: ChecklistResponse[] = ['YES', 'NO', 'PARTIAL']

/** Arbitrary for a ChecklistResponseRecord */
const arbChecklistResponseRecord = fc.record({
  id: fc.uuid(),
  reviewId: fc.uuid(),
  section: fc.string({ minLength: 1, maxLength: 50 }),
  item: fc.string({ minLength: 1, maxLength: 200 }),
  response: fc.option(fc.constantFrom(...checklistResponseValues), { nil: null }),
  comment: fc.string({ minLength: 0, maxLength: 200 }),
  evidenceLinks: fc.array(fc.webUrl(), { minLength: 0, maxLength: 5 }),
  actionRequired: fc.boolean(),
  createdAt: fc.date(),
})

/** Arbitrary for a valid Prisma PocReview record with checklist responses */
const arbReviewRow: fc.Arbitrary<ReviewRow> = fc.record({
  id: fc.uuid(),
  projectId: fc.uuid(),
  reviewDate: fc.date(),
  committeeType: fc.constantFrom(...committeeTypes),
  attendees: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 10 }),
  findingsSummary: fc.string({ minLength: 0, maxLength: 500 }),
  escalation: fc.boolean(),
  outcome: fc.option(fc.constantFrom(...reviewOutcomes), { nil: null }),
  createdAt: fc.date(),
  updatedAt: fc.date(),
  checklistResponses: fc.array(arbChecklistResponseRecord, { minLength: 0, maxLength: 20 }),
})

describe('Feature: prisma-migration, Property 4: Review mapping includes all checklist responses', () => {
  it('should preserve checklistResponses length and all fields of each entry', () => {
    fc.assert(
      fc.property(arbReviewRow, (review) => {
        const result = mapReview(review)

        // Length is preserved
        expect(result.checklistResponses).toHaveLength(review.checklistResponses.length)

        // Each entry preserves all fields
        for (let i = 0; i < review.checklistResponses.length; i++) {
          const source = review.checklistResponses[i]
          const mapped = result.checklistResponses[i]

          expect(mapped.id).toBe(source.id)
          expect(mapped.section).toBe(source.section)
          expect(mapped.item).toBe(source.item)
          expect(mapped.response).toBe(source.response ?? null)
          expect(mapped.comment).toBe(source.comment)
          expect(mapped.evidenceLinks).toEqual(source.evidenceLinks)
          expect(mapped.actionRequired).toBe(source.actionRequired)
        }
      }),
      { numRuns: 200 }
    )
  })
})
