import { describe, it, expect } from "vitest"
import { mergeChecklistWithTemplate } from "./checklist-merge"
import type { ChecklistItemPayload } from "./checklist-persistence-types"
import type { ChecklistSection } from "./store"

describe("mergeChecklistWithTemplate", () => {
  const projectId = "proj-1"

  it("returns blank entries when there are no saved items", () => {
    const template: ChecklistSection[] = [
      { section: "Governance", items: ["Item A", "Item B"] },
    ]

    const result = mergeChecklistWithTemplate([], template, projectId)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      id: "ws-proj-1-Governance-0",
      section: "Governance",
      item: "Item A",
      response: null,
      comment: "",
      evidenceLinks: [],
      actionRequired: false,
    })
    expect(result[1]).toEqual({
      id: "ws-proj-1-Governance-1",
      section: "Governance",
      item: "Item B",
      response: null,
      comment: "",
      evidenceLinks: [],
      actionRequired: false,
    })
  })

  it("preserves saved response data for items that still exist in the template", () => {
    const template: ChecklistSection[] = [
      { section: "Governance", items: ["Item A", "Item B"] },
    ]
    const saved: ChecklistItemPayload[] = [
      {
        section: "Governance",
        item: "Item A",
        response: "YES",
        comment: "All good",
        evidenceLinks: ["https://example.com/doc1"],
        actionRequired: false,
      },
      {
        section: "Governance",
        item: "Item B",
        response: "PARTIAL",
        comment: "Needs work",
        evidenceLinks: [],
        actionRequired: true,
      },
    ]

    const result = mergeChecklistWithTemplate(saved, template, projectId)

    expect(result[0]).toEqual({
      id: "ws-proj-1-Governance-0",
      section: "Governance",
      item: "Item A",
      response: "YES",
      comment: "All good",
      evidenceLinks: ["https://example.com/doc1"],
      actionRequired: false,
    })
    expect(result[1]).toEqual({
      id: "ws-proj-1-Governance-1",
      section: "Governance",
      item: "Item B",
      response: "PARTIAL",
      comment: "Needs work",
      evidenceLinks: [],
      actionRequired: true,
    })
  })

  it("creates blank entries for items newly added to the template", () => {
    const template: ChecklistSection[] = [
      { section: "Governance", items: ["Item A", "Item B", "Item C"] },
    ]
    const saved: ChecklistItemPayload[] = [
      {
        section: "Governance",
        item: "Item A",
        response: "YES",
        comment: "Done",
        evidenceLinks: [],
        actionRequired: false,
      },
    ]

    const result = mergeChecklistWithTemplate(saved, template, projectId)

    expect(result).toHaveLength(3)
    expect(result[0].response).toBe("YES")
    expect(result[1]).toEqual({
      id: "ws-proj-1-Governance-1",
      section: "Governance",
      item: "Item B",
      response: null,
      comment: "",
      evidenceLinks: [],
      actionRequired: false,
    })
    expect(result[2]).toEqual({
      id: "ws-proj-1-Governance-2",
      section: "Governance",
      item: "Item C",
      response: null,
      comment: "",
      evidenceLinks: [],
      actionRequired: false,
    })
  })

  it("discards saved records for items no longer in the template", () => {
    const template: ChecklistSection[] = [
      { section: "Governance", items: ["Item B"] },
    ]
    const saved: ChecklistItemPayload[] = [
      {
        section: "Governance",
        item: "Item A",
        response: "NO",
        comment: "Removed item",
        evidenceLinks: [],
        actionRequired: true,
      },
      {
        section: "Governance",
        item: "Item B",
        response: "YES",
        comment: "Kept",
        evidenceLinks: [],
        actionRequired: false,
      },
    ]

    const result = mergeChecklistWithTemplate(saved, template, projectId)

    expect(result).toHaveLength(1)
    expect(result[0].item).toBe("Item B")
    expect(result[0].response).toBe("YES")
    expect(result[0].comment).toBe("Kept")
  })

  it("handles multiple sections correctly", () => {
    const template: ChecklistSection[] = [
      { section: "Governance", items: ["Gov 1"] },
      { section: "Risk", items: ["Risk 1", "Risk 2"] },
    ]
    const saved: ChecklistItemPayload[] = [
      {
        section: "Risk",
        item: "Risk 1",
        response: "PARTIAL",
        comment: "In progress",
        evidenceLinks: ["link1"],
        actionRequired: true,
      },
    ]

    const result = mergeChecklistWithTemplate(saved, template, projectId)

    expect(result).toHaveLength(3)
    // Governance item should be blank
    expect(result[0].section).toBe("Governance")
    expect(result[0].response).toBeNull()
    // Risk 1 should have saved data
    expect(result[1].section).toBe("Risk")
    expect(result[1].item).toBe("Risk 1")
    expect(result[1].response).toBe("PARTIAL")
    expect(result[1].actionRequired).toBe(true)
    // Risk 2 should be blank
    expect(result[2].section).toBe("Risk")
    expect(result[2].item).toBe("Risk 2")
    expect(result[2].response).toBeNull()
  })

  it("generates deterministic IDs based on projectId, section, and index", () => {
    const template: ChecklistSection[] = [
      { section: "Governance", items: ["Item A", "Item B"] },
    ]

    const result1 = mergeChecklistWithTemplate([], template, projectId)
    const result2 = mergeChecklistWithTemplate([], template, projectId)

    expect(result1.map((r) => r.id)).toEqual(result2.map((r) => r.id))
    expect(result1[0].id).toBe("ws-proj-1-Governance-0")
    expect(result1[1].id).toBe("ws-proj-1-Governance-1")
  })

  it("returns empty array for empty template", () => {
    const result = mergeChecklistWithTemplate(
      [{ section: "Old", item: "X", response: "YES", comment: "", evidenceLinks: [], actionRequired: false }],
      [],
      projectId
    )
    expect(result).toEqual([])
  })
})
