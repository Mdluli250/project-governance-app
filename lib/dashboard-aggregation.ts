import type { ActionStatus, Classification } from "./types"

/**
 * Aggregates classification counts from a set of projects.
 *
 * For any set of projects with varied classifications (A, B, C),
 * produces classification counts where each count matches the actual
 * number of projects with that classification in the input set.
 */
export function aggregateClassificationCounts(
  projects: Array<{ classification: Classification }>
): { A: number; B: number; C: number } {
  const counts = { A: 0, B: 0, C: 0 }
  for (const project of projects) {
    const cls = project.classification
    if (cls in counts) {
      counts[cls]++
    }
  }
  return counts
}

/**
 * Counts overdue actions from a set of actions.
 *
 * An action is overdue if its dueDate is before today AND its status is not 'CLOSED'.
 * The `today` parameter allows deterministic testing by injecting the reference date.
 */
export function countOverdueActions(
  actions: Array<{ dueDate: string | Date; status: ActionStatus }>,
  today: Date
): number {
  const todayStart = new Date(today)
  todayStart.setHours(0, 0, 0, 0)

  let count = 0
  for (const action of actions) {
    const dueDate = new Date(action.dueDate)
    dueDate.setHours(0, 0, 0, 0)
    if (dueDate < todayStart && action.status !== "CLOSED") {
      count++
    }
  }
  return count
}
