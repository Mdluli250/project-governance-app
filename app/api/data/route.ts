import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db";

// ── Mapping helpers: DB row <-> App shape ──────────────────

function projectFromRow(r: Record<string, unknown>) {
  return {
    id: r.id,
    shortTitle: r.short_title,
    longTitle: r.long_title,
    classification: r.classification,
    cluster: r.cluster,
    impactArea: r.impact_area,
    pmId: r.pm_id,
    sponsorName: r.sponsor_name,
    strategicObjectives: r.strategic_objectives ?? [],
    contractValue: Number(r.contract_value) || 0,
    contractTerm: Number(r.contract_term) || 0,
    startDate: r.start_date,
    endDate: r.end_date,
    thisYearAmount: Number(r.this_year_amount) || 0,
    riskComplexity: r.risk_complexity,
    reputationalRisk: r.reputational_risk,
    rag: {
      overall: r.rag_overall ?? "GREEN",
      scope: r.rag_scope ?? "GREEN",
      schedule: r.rag_schedule ?? "GREEN",
      cost: r.rag_cost ?? "GREEN",
      quality: r.rag_quality ?? "GREEN",
      risk: r.rag_risk ?? "GREEN",
      sheq: r.rag_sheq ?? "GREEN",
      data: r.rag_data ?? "GREEN",
      compliance: r.rag_compliance ?? "GREEN",
    },
    healthNarrative: r.health_narrative ?? "",
    lastUpdated: r.last_updated,
  }
}

function projectToRow(p: Record<string, unknown>) {
  const rag = p.rag as Record<string, string> | undefined
  const row: Record<string, unknown> = {}
  if (p.id !== undefined) row.id = p.id
  if (p.shortTitle !== undefined) row.short_title = p.shortTitle
  if (p.longTitle !== undefined) row.long_title = p.longTitle
  if (p.classification !== undefined) row.classification = p.classification
  if (p.cluster !== undefined) row.cluster = p.cluster
  if (p.impactArea !== undefined) row.impact_area = p.impactArea
  if (p.pmId !== undefined) row.pm_id = p.pmId
  if (p.sponsorName !== undefined) row.sponsor_name = p.sponsorName
  if (p.strategicObjectives !== undefined) row.strategic_objectives = p.strategicObjectives
  if (p.contractValue !== undefined) row.contract_value = p.contractValue
  if (p.contractTerm !== undefined) row.contract_term = p.contractTerm
  if (p.startDate !== undefined) row.start_date = p.startDate
  if (p.endDate !== undefined) row.end_date = p.endDate
  if (p.thisYearAmount !== undefined) row.this_year_amount = p.thisYearAmount
  if (p.riskComplexity !== undefined) row.risk_complexity = p.riskComplexity
  if (p.reputationalRisk !== undefined) row.reputational_risk = p.reputationalRisk
  if (p.healthNarrative !== undefined) row.health_narrative = p.healthNarrative
  if (p.lastUpdated !== undefined) row.last_updated = p.lastUpdated
  if (rag) {
    row.rag_overall = rag.overall
    row.rag_scope = rag.scope
    row.rag_schedule = rag.schedule
    row.rag_cost = rag.cost
    row.rag_quality = rag.quality
    row.rag_risk = rag.risk
    row.rag_sheq = rag.sheq
    row.rag_data = rag.data
    row.rag_compliance = rag.compliance
  }
  return row
}

function actionFromRow(r: Record<string, unknown>) {
  return {
    id: r.id,
    projectId: r.project_id,
    reviewId: r.review_id ?? undefined,
    description: r.description,
    owner: r.owner,
    dueDate: r.due_date,
    status: r.status,
    category: r.category,
    evidenceLinks: r.evidence_links ?? [],
  }
}

function reviewFromRow(r: Record<string, unknown>) {
  return {
    id: r.id,
    projectId: r.project_id,
    reviewDate: r.review_date,
    committeeType: r.committee_type,
    attendees: r.attendees ?? [],
    checklistResponses: [],
    findingsSummary: r.findings_summary ?? "",
    escalation: r.escalation ?? false,
    outcome: r.outcome,
  }
}

function riskFromRow(r: Record<string, unknown>) {
  return {
    id: r.id,
    projectId: r.project_id,
    title: r.title,
    type: r.type,
    likelihood: r.likelihood,
    impact: r.impact,
    ragStatus: r.rag_status,
    mitigation: r.mitigation ?? "",
    owner: r.owner,
    status: r.status,
  }
}

function auditFromRow(r: Record<string, unknown>) {
  return {
    id: r.id,
    projectId: r.project_id,
    timestamp: r.timestamp,
    actor: r.actor,
    type: r.type,
    description: r.description,
    oldValue: r.old_value ?? undefined,
    newValue: r.new_value ?? undefined,
  }
}

function kdaFromRow(r: Record<string, unknown>) {
  return {
    id: r.id,
    projectId: r.project_id,
    gateName: r.gate_name,
    stage: r.stage,
    submissionStatus: r.submission_status,
    decision: r.decision,
    notes: r.notes ?? "",
    signedOffBy: r.signed_off_by,
    date: r.date,
  }
}

function sessionFromRow(r: Record<string, unknown>, projectIds: string[]) {
  return {
  id: r.id,
  date: r.date,
  committeeType: r.committee_type,
  projectIds,
  status: r.status,
  attendees: (r.attendees as string[] | null) ?? [],
  }
  }

// ── GET: Load all data ─────────────────────────────────────
export async function GET() {
  try {
    const [projRes, actRes, revRes, riskRes, auditRes, kdaRes, sessRes, spRes, clRes] =
      await Promise.all([
        query("SELECT * FROM projects ORDER BY short_title"),
        query("SELECT * FROM actions ORDER BY created_at"),
        query("SELECT * FROM poc_reviews ORDER BY review_date DESC"),
        query("SELECT * FROM risks ORDER BY created_at"),
        query("SELECT * FROM audit_log ORDER BY timestamp DESC"),
        query("SELECT * FROM kda_decisions ORDER BY date DESC"),
        query("SELECT * FROM poc_sessions ORDER BY date DESC"),
        query("SELECT session_id, project_id FROM session_projects"),
        query("SELECT * FROM checklist_responses"),
      ])

    // Build session -> projectIds map
    const sessionProjectMap: Record<string, string[]> = {}
    for (const sp of spRes.rows ?? []) {
      if (!sessionProjectMap[sp.session_id]) sessionProjectMap[sp.session_id] = []
      sessionProjectMap[sp.session_id].push(sp.project_id)
    }

    // Build review -> checklist map
    const reviewChecklistMap: Record<string, unknown[]> = {}
    for (const cl of clRes.rows ?? []) {
      if (!reviewChecklistMap[cl.review_id]) reviewChecklistMap[cl.review_id] = []
      reviewChecklistMap[cl.review_id].push({
        id: cl.id,
        section: cl.section,
        item: cl.item,
        response: cl.response,
        comment: cl.comment ?? "",
        evidenceLinks: cl.evidence_links ?? [],
        actionRequired: cl.action_required ?? false,
      })
    }

    const reviews = (revRes.rows ?? []).map((r) => {
      const review = reviewFromRow(r)
      review.checklistResponses = (reviewChecklistMap[r.id as string] ?? []) as typeof review.checklistResponses
      return review
    })

    return NextResponse.json({
      projects: (projRes.rows ?? []).map(projectFromRow),
      actions: (actRes.rows ?? []).map(actionFromRow),
      reviews,
      risks: (riskRes.rows ?? []).map(riskFromRow),
      auditLog: (auditRes.rows ?? []).map(auditFromRow),
      kdaDecisions: (kdaRes.rows ?? []).map(kdaFromRow),
      sessions: (sessRes.rows ?? []).map((r) =>
        sessionFromRow(r, sessionProjectMap[r.id as string] ?? [])
      ),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Failed to load data:", message)
    return NextResponse.json({ error: "Failed to load data", details: [message] }, { status: 500 })
  }
}

// ── POST: Persist a mutation ───────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, entity, data } = body as { action: string; entity: string; data: Record<string, unknown> }

  try {
    switch (entity) {
      case "project": {
        if (action === "upsert") {
          const row = projectToRow(data)
          const fields = Object.keys(row)
          const placeholders = fields.map((_, i) => `$${i + 1}`)
          const values = fields.map((f) => row[f])
          const updateSet = fields.filter(f => f !== 'id').map((f, i) => `${f} = $${fields.indexOf(f) + 1}`).join(", ")
          
          await query(
            `INSERT INTO projects (${fields.join(", ")}) VALUES (${placeholders.join(", ")})
             ON CONFLICT (id) DO UPDATE SET ${updateSet}`,
            values
          )
        }
        break
      }
      case "action": {
        if (action === "insert") {
          await query(
            `INSERT INTO actions (id, project_id, review_id, description, owner, due_date, status, category, evidence_links)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              data.id,
              data.projectId,
              data.reviewId || null,
              data.description,
              data.owner,
              data.dueDate,
              data.status,
              data.category,
              data.evidenceLinks ?? [],
            ]
          )
        } else if (action === "update") {
          const updates: [string, unknown][] = []
          let paramIndex = 1

          if (data.description !== undefined) {
            updates.push([`description = $${paramIndex}`, data.description])
            paramIndex++
          }
          if (data.owner !== undefined) {
            updates.push([`owner = $${paramIndex}`, data.owner])
            paramIndex++
          }
          if (data.dueDate !== undefined) {
            updates.push([`due_date = $${paramIndex}`, data.dueDate])
            paramIndex++
          }
          if (data.status !== undefined) {
            updates.push([`status = $${paramIndex}`, data.status])
            paramIndex++
          }
          if (data.category !== undefined) {
            updates.push([`category = $${paramIndex}`, data.category])
            paramIndex++
          }
          if (data.evidenceLinks !== undefined) {
            updates.push([`evidence_links = $${paramIndex}`, data.evidenceLinks])
            paramIndex++
          }

          if (updates.length > 0) {
            const updateSet = updates.map(([clause]) => clause).join(", ")
            const values = updates.map(([, val]) => val)
            values.push(data.id)

            await query(
              `UPDATE actions SET ${updateSet} WHERE id = $${paramIndex}`,
              values
            )
          }
        }
        break
      }
      case "review": {
        if (action === "insert") {
          await query(
            `INSERT INTO poc_reviews (id, project_id, review_date, committee_type, attendees, findings_summary, escalation, outcome)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              data.id,
              data.projectId,
              data.reviewDate,
              data.committeeType,
              data.attendees ?? [],
              data.findingsSummary ?? "",
              data.escalation ?? false,
              data.outcome,
            ]
          )

          // Also insert checklist responses
          const checklist = (data.checklistResponses ?? []) as Record<string, unknown>[]
          if (checklist.length > 0) {
            for (const cl of checklist) {
              await query(
                `INSERT INTO checklist_responses (id, review_id, section, item, response, comment, evidence_links, action_required)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                  cl.id,
                  data.id,
                  cl.section,
                  cl.item,
                  cl.response,
                  cl.comment ?? "",
                  cl.evidenceLinks ?? [],
                  cl.actionRequired ?? false,
                ]
              )
            }
          }
        } else if (action === "update") {
          const updates: [string, unknown][] = []
          let paramIndex = 1

          if (data.findingsSummary !== undefined) {
            updates.push([`findings_summary = $${paramIndex}`, data.findingsSummary])
            paramIndex++
          }
          if (data.outcome !== undefined) {
            updates.push([`outcome = $${paramIndex}`, data.outcome])
            paramIndex++
          }
          if (data.escalation !== undefined) {
            updates.push([`escalation = $${paramIndex}`, data.escalation])
            paramIndex++
          }
          if (data.attendees !== undefined) {
            updates.push([`attendees = $${paramIndex}`, data.attendees])
            paramIndex++
          }

          if (updates.length > 0) {
            const updateSet = updates.map(([clause]) => clause).join(", ")
            const values = updates.map(([, val]) => val)
            values.push(data.id)

            await query(
              `UPDATE poc_reviews SET ${updateSet} WHERE id = $${paramIndex}`,
              values
            )
          }

          // Update checklist responses if provided
          const checklist = data.checklistResponses as Record<string, unknown>[] | undefined
          if (checklist && checklist.length > 0) {
            // Delete old + re-insert
            await query("DELETE FROM checklist_responses WHERE review_id = $1", [data.id])
            for (const cl of checklist) {
              await query(
                `INSERT INTO checklist_responses (id, review_id, section, item, response, comment, evidence_links, action_required)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                  cl.id,
                  data.id,
                  cl.section,
                  cl.item,
                  cl.response,
                  cl.comment ?? "",
                  cl.evidenceLinks ?? [],
                  cl.actionRequired ?? false,
                ]
              )
            }
          }
        }
        break
      }
      case "risk": {
        if (action === "insert") {
          await query(
            `INSERT INTO risks (id, project_id, title, type, likelihood, impact, rag_status, mitigation, owner, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              data.id,
              data.projectId,
              data.title,
              data.type,
              data.likelihood,
              data.impact,
              data.ragStatus,
              data.mitigation ?? "",
              data.owner,
              data.status,
            ]
          )
        } else if (action === "update") {
          const updates: [string, unknown][] = []
          let paramIndex = 1

          if (data.title !== undefined) {
            updates.push([`title = $${paramIndex}`, data.title])
            paramIndex++
          }
          if (data.type !== undefined) {
            updates.push([`type = $${paramIndex}`, data.type])
            paramIndex++
          }
          if (data.likelihood !== undefined) {
            updates.push([`likelihood = $${paramIndex}`, data.likelihood])
            paramIndex++
          }
          if (data.impact !== undefined) {
            updates.push([`impact = $${paramIndex}`, data.impact])
            paramIndex++
          }
          if (data.ragStatus !== undefined) {
            updates.push([`rag_status = $${paramIndex}`, data.ragStatus])
            paramIndex++
          }
          if (data.mitigation !== undefined) {
            updates.push([`mitigation = $${paramIndex}`, data.mitigation])
            paramIndex++
          }
          if (data.owner !== undefined) {
            updates.push([`owner = $${paramIndex}`, data.owner])
            paramIndex++
          }
          if (data.status !== undefined) {
            updates.push([`status = $${paramIndex}`, data.status])
            paramIndex++
          }

          if (updates.length > 0) {
            const updateSet = updates.map(([clause]) => clause).join(", ")
            const values = updates.map(([, val]) => val)
            values.push(data.id)

            await query(
              `UPDATE risks SET ${updateSet} WHERE id = $${paramIndex}`,
              values
            )
          }
        }
        break
      }
      case "audit": {
        if (action === "insert") {
          await query(
            `INSERT INTO audit_log (id, project_id, timestamp, actor, type, description, old_value, new_value)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              data.id,
              data.projectId,
              data.timestamp,
              data.actor,
              data.type,
              data.description,
              data.oldValue ?? null,
              data.newValue ?? null,
            ]
          )
        }
        break
      }
      case "kda": {
        if (action === "insert") {
          await query(
            `INSERT INTO kda_decisions (id, project_id, gate_name, stage, submission_status, decision, notes, signed_off_by, date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              data.id,
              data.projectId,
              data.gateName,
              data.stage,
              data.submissionStatus,
              data.decision,
              data.notes ?? "",
              data.signedOffBy,
              data.date,
            ]
          )
        }
        break
      }
      case "session": {
        if (action === "insert") {
          await query(
            `INSERT INTO poc_sessions (id, date, committee_type, status, attendees)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              data.id,
              data.date,
              data.committeeType,
              data.status,
              (data.attendees as string[]) ?? [],
            ]
          )

          const pIds = (data.projectIds ?? []) as string[]
          if (pIds.length > 0) {
            for (const pid of pIds) {
              await query(
                `INSERT INTO session_projects (session_id, project_id) VALUES ($1, $2)`,
                [data.id, pid]
              )
            }
          }
        } else if (action === "update") {
          const updates: [string, unknown][] = []
          let paramIndex = 1

          if (data.status !== undefined) {
            updates.push([`status = $${paramIndex}`, data.status])
            paramIndex++
          }
          if (data.date !== undefined) {
            updates.push([`date = $${paramIndex}`, data.date])
            paramIndex++
          }
          if (data.committeeType !== undefined) {
            updates.push([`committee_type = $${paramIndex}`, data.committeeType])
            paramIndex++
          }
          if (data.attendees !== undefined) {
            updates.push([`attendees = $${paramIndex}`, data.attendees])
            paramIndex++
          }

          if (updates.length > 0) {
            const updateSet = updates.map(([clause]) => clause).join(", ")
            const values = updates.map(([, val]) => val)
            values.push(data.id)

            await query(
              `UPDATE poc_sessions SET ${updateSet} WHERE id = $${paramIndex}`,
              values
            )
          }

          // Update project list if provided
          if (data.projectIds !== undefined) {
            await query(`DELETE FROM session_projects WHERE session_id = $1`, [data.id])
            const pIds = data.projectIds as string[]
            if (pIds.length > 0) {
              for (const pid of pIds) {
                await query(
                  `INSERT INTO session_projects (session_id, project_id) VALUES ($1, $2)`,
                  [data.id, pid]
                )
              }
            }
          }
        }
        break
      }
      default:
        return NextResponse.json({ error: `Unknown entity: ${entity}` }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Data mutation error (${entity}/${action}):`, message)
    return NextResponse.json({ error: "Failed to persist", detail: message }, { status: 500 })
  }
}
