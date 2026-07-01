import type {
  StrategicObjective,
  ChecklistSection,
  ActionCategoryItem,
} from "./store"
import { getAuthHeaders } from "./auth-token"

// ── Load all config via API route (uses service role on server) ─
export async function loadAllConfig(): Promise<{
  clusters: string[]
  impactAreas: Record<string, string[]>
  strategicObjectives: StrategicObjective[]
  checklistTemplate: ChecklistSection[]
  actionCategories: ActionCategoryItem[]
}> {
  const res = await fetch("/api/config", {
    headers: { ...getAuthHeaders() },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    console.error("loadAllConfig failed:", res.status, body)
    throw new Error(body.error || `Failed to load config (${res.status})`)
  }
  return res.json()
}

// ── Save helpers (each calls the PUT endpoint) ─────────────
async function saveSection(section: string, data: unknown) {
  const res = await fetch("/api/config", {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ section, data }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    console.error(`saveSection("${section}") failed:`, res.status, body)
    throw new Error(body.error || `Failed to save ${section} (${res.status})`)
  }
  return res.json()
}

export async function saveClusters(
  clusters: string[],
  impactAreas: Record<string, string[]>
) {
  return saveSection("clusters", { clusters, impactAreas })
}

export async function saveStrategicObjectives(
  objectives: StrategicObjective[]
) {
  return saveSection("strategic_objectives", objectives)
}

export async function saveChecklistTemplate(template: ChecklistSection[]) {
  return saveSection("checklist_template", template)
}

export async function saveActionCategories(categories: ActionCategoryItem[]) {
  return saveSection("action_categories", categories)
}
