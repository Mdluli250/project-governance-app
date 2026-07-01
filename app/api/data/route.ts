import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { mapProject, mapAction, mapReview, mapRisk, mapAudit, mapKda, mapSession } from "@/lib/prisma-mappers"
import { verifyAuth } from "@/lib/auth-middleware"

// ── GET: Load all data ─────────────────────────────────────
export async function GET(req: NextRequest) {
  const authError = verifyAuth(req)
  if (authError) return authError

  try {
    const [projects, actions, reviews, risks, auditLog, kdaDecisions, sessions] =
      await Promise.all([
        prisma.project.findMany({ include: { pm: true }, orderBy: { shortTitle: 'asc' } }),
        prisma.action.findMany({ orderBy: { createdAt: 'asc' } }),
        prisma.pocReview.findMany({ include: { checklistResponses: true }, orderBy: { reviewDate: 'desc' } }),
        prisma.risk.findMany({ orderBy: { createdAt: 'asc' } }),
        prisma.auditLog.findMany({ orderBy: { timestamp: 'desc' } }),
        prisma.kdaDecision.findMany({ orderBy: { date: 'desc' } }),
        prisma.pocSession.findMany({ include: { sessionProjects: true }, orderBy: { date: 'desc' } }),
      ])

    return NextResponse.json({
      projects: projects.map(mapProject),
      actions: actions.map(mapAction),
      reviews: reviews.map(mapReview),
      risks: risks.map(mapRisk),
      auditLog: auditLog.map(mapAudit),
      kdaDecisions: kdaDecisions.map(mapKda),
      sessions: sessions.map(mapSession),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Failed to load data:", message)
    return NextResponse.json({ error: "Failed to load data", details: [message] }, { status: 500 })
  }
}

// ── POST: Persist a mutation ───────────────────────────────
const VALID_ENTITIES = ["project", "action", "review", "risk", "audit", "kda", "session"] as const
const VALID_ACTIONS = ["insert", "update", "upsert"] as const

// Valid enum values (sourced from PostgreSQL migration ENUMs)
const VALID_ROLES = ['PM', 'POC_CHAIR', 'POC_MEMBER', 'ADMIN'] as const
const VALID_RAG = ['GREEN', 'AMBER', 'RED'] as const
const VALID_RISK_COMPLEXITY = ['LOW', 'MEDIUM', 'HIGH'] as const
const VALID_REPUTATIONAL_RISK = ['LOW', 'MEDIUM', 'HIGH'] as const
const VALID_CLASSIFICATION = ['A', 'B', 'C'] as const
const VALID_RISK_TYPE = ['RISK', 'ISSUE'] as const
const VALID_RISK_STATUS = ['OPEN', 'MITIGATED', 'CLOSED'] as const
const VALID_ACTION_STATUS = ['OPEN', 'IN_PROGRESS', 'CLOSED'] as const
const VALID_LIKELIHOOD = ['LOW', 'MEDIUM', 'HIGH'] as const
const VALID_IMPACT = ['LOW', 'MEDIUM', 'HIGH'] as const
const VALID_COMMITTEE_TYPE = ['DIVISIONAL', 'CLUSTER', 'IMPACT_AREA'] as const
const VALID_REVIEW_OUTCOME = ['APPROVED', 'APPROVED_WITH_ACTIONS', 'REJECTED', 'DEFERRED'] as const
const VALID_SESSION_STATUS = ['DRAFT', 'IN_PROGRESS', 'COMPLETED'] as const
const VALID_ACTION_CATEGORY = ['GOVERNANCE', 'RISK', 'SHEQ', 'COMPLIANCE', 'DATA', 'CONTRACT', 'SCHEDULE', 'FINANCE'] as const
const VALID_CHECKLIST_RESPONSE = ['YES', 'NO', 'PARTIAL'] as const
const VALID_AUDIT_TYPE = ['CLASSIFICATION_CHANGE', 'RAG_CHANGE', 'POC_DECISION', 'KDA_DECISION', 'ACTION_CHANGE', 'HEALTH_UPDATE', 'PROJECT_UPDATE', 'REVIEW_CREATED', 'RISK'] as const
const VALID_GATE_DECISION = ['APPROVED', 'REJECTED', 'EXCEPTION_REQUIRED'] as const

/** Validate a single enum field if present. Returns an error string or null. */
function validateEnum(fieldName: string, value: unknown, validValues: readonly string[]): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string' || !validValues.includes(value)) {
    return `${fieldName} must be one of: ${validValues.join(', ')} (got "${value}")`
  }
  return null
}

export async function POST(req: NextRequest) {
  const authError = verifyAuth(req)
  if (authError) return authError

  const body = await req.json()
  const { action, entity, data } = body as { action: string; entity: string; data: Record<string, unknown> }

  // Input validation
  const validationErrors: string[] = []
  if (!entity) {
    validationErrors.push("entity is required")
  } else if (!VALID_ENTITIES.includes(entity as typeof VALID_ENTITIES[number])) {
    validationErrors.push(`entity must be one of: ${VALID_ENTITIES.join(", ")}`)
  }
  if (!action) {
    validationErrors.push("action is required")
  } else if (!VALID_ACTIONS.includes(action as typeof VALID_ACTIONS[number])) {
    validationErrors.push(`action must be one of: ${VALID_ACTIONS.join(", ")}`)
  }
  if (!data?.id) {
    validationErrors.push("data.id is required")
  }
  if (validationErrors.length > 0) {
    return NextResponse.json({ error: "Missing required fields", details: validationErrors }, { status: 400 })
  }

  // Enum validation — only validate fields that are PRESENT in the request
  const enumErrors: (string | null)[] = []

  if (entity === "project") {
    enumErrors.push(
      validateEnum("classification", data.classification, VALID_CLASSIFICATION),
      validateEnum("riskComplexity", data.riskComplexity, VALID_RISK_COMPLEXITY),
      validateEnum("reputationalRisk", data.reputationalRisk, VALID_REPUTATIONAL_RISK),
    )
    // Validate RAG fields if the rag object is present
    const rag = data.rag as Record<string, unknown> | undefined
    if (rag) {
      enumErrors.push(
        validateEnum("rag.overall", rag.overall, VALID_RAG),
        validateEnum("rag.scope", rag.scope, VALID_RAG),
        validateEnum("rag.schedule", rag.schedule, VALID_RAG),
        validateEnum("rag.cost", rag.cost, VALID_RAG),
        validateEnum("rag.quality", rag.quality, VALID_RAG),
        validateEnum("rag.risk", rag.risk, VALID_RAG),
        validateEnum("rag.sheq", rag.sheq, VALID_RAG),
        validateEnum("rag.data", rag.data, VALID_RAG),
        validateEnum("rag.compliance", rag.compliance, VALID_RAG),
      )
    }
  } else if (entity === "action") {
    enumErrors.push(
      validateEnum("status", data.status, VALID_ACTION_STATUS),
      validateEnum("category", data.category, VALID_ACTION_CATEGORY),
    )
  } else if (entity === "review") {
    enumErrors.push(
      validateEnum("committeeType", data.committeeType, VALID_COMMITTEE_TYPE),
      validateEnum("outcome", data.outcome, VALID_REVIEW_OUTCOME),
    )
    // Validate checklist response enum values if present
    const checklist = data.checklistResponses as Record<string, unknown>[] | undefined
    if (checklist && Array.isArray(checklist)) {
      for (let i = 0; i < checklist.length; i++) {
        enumErrors.push(
          validateEnum(`checklistResponses[${i}].response`, checklist[i].response, VALID_CHECKLIST_RESPONSE),
        )
      }
    }
  } else if (entity === "risk") {
    enumErrors.push(
      validateEnum("type", data.type, VALID_RISK_TYPE),
      validateEnum("status", data.status, VALID_RISK_STATUS),
      validateEnum("likelihood", data.likelihood, VALID_LIKELIHOOD),
      validateEnum("impact", data.impact, VALID_IMPACT),
      validateEnum("ragStatus", data.ragStatus, VALID_RAG),
    )
  } else if (entity === "audit") {
    enumErrors.push(
      validateEnum("type", data.type, VALID_AUDIT_TYPE),
    )
  } else if (entity === "kda") {
    enumErrors.push(
      validateEnum("decision", data.decision, VALID_GATE_DECISION),
    )
  } else if (entity === "session") {
    enumErrors.push(
      validateEnum("committeeType", data.committeeType, VALID_COMMITTEE_TYPE),
      validateEnum("status", data.status, VALID_SESSION_STATUS),
    )
  }

  const actualEnumErrors = enumErrors.filter((e): e is string => e !== null)
  if (actualEnumErrors.length > 0) {
    return NextResponse.json({ error: "Invalid enum values", details: actualEnumErrors }, { status: 400 })
  }

  try {
    switch (entity) {
      case "project": {
        if (action === "upsert") {
          const rag = data.rag as Record<string, string> | undefined
          const projectData = {
            shortTitle: data.shortTitle as string,
            longTitle: data.longTitle as string,
            classification: data.classification,
            cluster: data.cluster as string,
            impactArea: data.impactArea as string,
            pmId: data.pmId as string,
            sponsorName: data.sponsorName as string,
            strategicObjectives: (data.strategicObjectives as string[]) ?? [],
            contractValue: data.contractValue as number,
            contractTerm: data.contractTerm as number,
            startDate: data.startDate ? new Date(data.startDate as string) : null,
            endDate: data.endDate ? new Date(data.endDate as string) : null,
            thisYearAmount: data.thisYearAmount as number,
            riskComplexity: (data.riskComplexity) || null,
            reputationalRisk: (data.reputationalRisk) || null,
            healthNarrative: (data.healthNarrative as string) ?? "",
            lastUpdated: data.lastUpdated ? new Date(data.lastUpdated as string) : null,
            ...(rag && {
              ragOverall: rag.overall,
              ragScope: rag.scope,
              ragSchedule: rag.schedule,
              ragCost: rag.cost,
              ragQuality: rag.quality,
              ragRisk: rag.risk,
              ragSheq: rag.sheq,
              ragData: rag.data,
              ragCompliance: rag.compliance,
            }),
          }

          await prisma.project.upsert({
            where: { id: data.id as string },
            create: { id: data.id as string, ...projectData },
            update: projectData,
          })
        }
        break
      }
      case "action": {
        if (action === "insert") {
          await prisma.action.create({
            data: {
              id: data.id as string,
              projectId: data.projectId as string,
              reviewId: (data.reviewId as string) || null,
              description: data.description as string,
              owner: data.owner as string,
              dueDate: data.dueDate ? new Date(data.dueDate as string) : null,
              status: data.status,
              category: data.category,
              evidenceLinks: (data.evidenceLinks as string[]) ?? [],
            },
          })
        } else if (action === "update") {
          const updateData: Record<string, unknown> = {}
          if (data.description !== undefined) updateData.description = data.description
          if (data.owner !== undefined) updateData.owner = data.owner
          if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate as string) : null
          if (data.status !== undefined) updateData.status = data.status
          if (data.category !== undefined) updateData.category = data.category
          if (data.evidenceLinks !== undefined) updateData.evidenceLinks = data.evidenceLinks
          updateData.updatedAt = new Date()

          if (Object.keys(updateData).length > 0) {
            await prisma.action.update({
              where: { id: data.id as string },
              data: updateData,
            })
          }
        }
        break
      }
      case "review": {
        if (action === "insert") {
          const checklist = (data.checklistResponses ?? []) as Record<string, unknown>[]
          await prisma.pocReview.create({
            data: {
              id: data.id as string,
              projectId: data.projectId as string,
              reviewDate: new Date(data.reviewDate as string),
              committeeType: data.committeeType,
              attendees: (data.attendees as string[]) ?? [],
              findingsSummary: (data.findingsSummary as string) ?? "",
              escalation: (data.escalation as boolean) ?? false,
              outcome: (data.outcome) ?? null,
              checklistResponses: checklist.length > 0 ? {
                createMany: {
                  data: checklist.map((cl) => ({
                    id: cl.id as string,
                    section: cl.section as string,
                    item: cl.item as string,
                    response: (cl.response) ?? null,
                    comment: (cl.comment as string) ?? "",
                    evidenceLinks: (cl.evidenceLinks as string[]) ?? [],
                    actionRequired: (cl.actionRequired as boolean) ?? false,
                  })),
                },
              } : undefined,
            },
          })
        } else if (action === "update") {
          const checklist = data.checklistResponses as Record<string, unknown>[] | undefined

          await prisma.$transaction(async (tx) => {
            const updateData: Record<string, unknown> = {}
            if (data.findingsSummary !== undefined) updateData.findingsSummary = data.findingsSummary
            if (data.outcome !== undefined) updateData.outcome = data.outcome
            if (data.escalation !== undefined) updateData.escalation = data.escalation
            if (data.attendees !== undefined) updateData.attendees = data.attendees
            updateData.updatedAt = new Date()

            if (Object.keys(updateData).length > 0) {
              await tx.pocReview.update({
                where: { id: data.id as string },
                data: updateData,
              })
            }

            if (checklist && checklist.length > 0) {
              await tx.checklistResponseRecord.deleteMany({
                where: { reviewId: data.id as string },
              })
              await tx.checklistResponseRecord.createMany({
                data: checklist.map((cl) => ({
                  id: cl.id as string,
                  reviewId: data.id as string,
                  section: cl.section as string,
                  item: cl.item as string,
                  response: (cl.response) ?? null,
                  comment: (cl.comment as string) ?? "",
                  evidenceLinks: (cl.evidenceLinks as string[]) ?? [],
                  actionRequired: (cl.actionRequired as boolean) ?? false,
                })),
              })
            }
          })
        }
        break
      }
      case "risk": {
        if (action === "insert") {
          await prisma.risk.create({
            data: {
              id: data.id as string,
              projectId: data.projectId as string,
              title: data.title as string,
              type: data.type,
              likelihood: (data.likelihood) ?? null,
              impact: (data.impact) ?? null,
              ragStatus: (data.ragStatus) ?? null,
              mitigation: (data.mitigation as string) ?? "",
              owner: data.owner as string,
              status: data.status,
            },
          })
        } else if (action === "update") {
          const updateData: Record<string, unknown> = {}
          if (data.title !== undefined) updateData.title = data.title
          if (data.type !== undefined) updateData.type = data.type
          if (data.likelihood !== undefined) updateData.likelihood = data.likelihood
          if (data.impact !== undefined) updateData.impact = data.impact
          if (data.ragStatus !== undefined) updateData.ragStatus = data.ragStatus
          if (data.mitigation !== undefined) updateData.mitigation = data.mitigation
          if (data.owner !== undefined) updateData.owner = data.owner
          if (data.status !== undefined) updateData.status = data.status
          updateData.updatedAt = new Date()

          if (Object.keys(updateData).length > 0) {
            await prisma.risk.update({
              where: { id: data.id as string },
              data: updateData,
            })
          }
        }
        break
      }
      case "audit": {
        if (action === "insert") {
          await prisma.auditLog.create({
            data: {
              id: data.id as string,
              projectId: data.projectId as string,
              timestamp: new Date(data.timestamp as string),
              actor: data.actor as string,
              type: data.type,
              description: data.description as string,
              oldValue: (data.oldValue as string) ?? null,
              newValue: (data.newValue as string) ?? null,
            },
          })
        }
        break
      }
      case "kda": {
        if (action === "insert") {
          await prisma.kdaDecision.create({
            data: {
              id: data.id as string,
              projectId: data.projectId as string,
              gateName: data.gateName as string,
              stage: data.stage as string,
              submissionStatus: data.submissionStatus as string,
              decision: (data.decision) ?? null,
              notes: (data.notes as string) ?? "",
              signedOffBy: data.signedOffBy as string,
              date: new Date(data.date as string),
            },
          })
        }
        break
      }
      case "session": {
        if (action === "insert") {
          const projectIds = (data.projectIds ?? []) as string[]
          await prisma.pocSession.create({
            data: {
              id: data.id as string,
              date: new Date(data.date as string),
              committeeType: data.committeeType,
              status: data.status,
              attendees: (data.attendees as string[]) ?? [],
              sessionProjects: projectIds.length > 0 ? {
                createMany: {
                  data: projectIds.map((pid) => ({ projectId: pid })),
                },
              } : undefined,
            },
          })
        } else if (action === "update") {
          await prisma.$transaction(async (tx) => {
            const updateData: Record<string, unknown> = {}
            if (data.status !== undefined) updateData.status = data.status
            if (data.date !== undefined) updateData.date = new Date(data.date as string)
            if (data.committeeType !== undefined) updateData.committeeType = data.committeeType
            if (data.attendees !== undefined) updateData.attendees = data.attendees
            updateData.updatedAt = new Date()

            if (Object.keys(updateData).length > 0) {
              await tx.pocSession.update({
                where: { id: data.id as string },
                data: updateData,
              })
            }

            if (data.projectIds !== undefined) {
              await tx.sessionProject.deleteMany({
                where: { sessionId: data.id as string },
              })
              const pIds = data.projectIds as string[]
              if (pIds.length > 0) {
                await tx.sessionProject.createMany({
                  data: pIds.map((pid) => ({
                    sessionId: data.id as string,
                    projectId: pid,
                  })),
                })
              }
            }
          })
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
    return NextResponse.json({ error: "Failed to persist", details: [message] }, { status: 500 })
  }
}
