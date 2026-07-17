import type { ChecklistItem } from "./types"
import type { ChecklistItemPayload } from "./checklist-persistence-types"
import type { ChecklistSection } from "./store"

/**
 * Merges saved checklist responses with the current checklist template.
 *
 * - For each template section/item: uses the saved response data if a matching record exists
 * - Creates blank entries for items newly added to the template
 * - Discards saved records for items no longer in the template
 *
 * @param saved - Previously persisted checklist item payloads
 * @param template - Current checklist template sections
 * @param projectId - Project ID used for deterministic ID generation
 * @returns Merged ChecklistItem array matching the current template structure
 */
export function mergeChecklistWithTemplate(
  saved: ChecklistItemPayload[],
  template: ChecklistSection[],
  projectId: string
): ChecklistItem[] {
  // Build a lookup map from saved items keyed by "section|item"
  const savedMap = new Map<string, ChecklistItemPayload>()
  for (const item of saved) {
    savedMap.set(`${item.section}|${item.item}`, item)
  }

  return template.flatMap((section) =>
    section.items.map((itemText, idx) => {
      const key = `${section.section}|${itemText}`
      const savedItem = savedMap.get(key)

      return {
        id: `ws-${projectId}-${section.section}-${idx}`,
        section: section.section,
        item: itemText,
        response: savedItem?.response ?? null,
        comment: savedItem?.comment ?? "",
        evidenceLinks: savedItem?.evidenceLinks ?? [],
        actionRequired: savedItem?.actionRequired ?? false,
      }
    })
  )
}
