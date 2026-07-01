import type {
  Profile as PrismaProfile,
  Project as PrismaProject,
  Action as PrismaAction,
  PocReview as PrismaPocReview,
  Risk as PrismaRisk,
  AuditLog as PrismaAuditLog,
  KdaDecision as PrismaKdaDecision,
  PocSession as PrismaPocSession,
  SessionProject,
  ChecklistResponseRecord,
} from '@prisma/client'
import type {
  User,
  Project,
  Action,
  POCReview,
  RiskIssue,
  AuditEntry,
  KDADecision,
  POCSession,
  ChecklistItem,
  RAGDimensions,
} from './types'

// ─── Input Types (Prisma query results with includes) ────────────────────────

export type ProfileRow = PrismaProfile

export type ProjectRow = PrismaProject

export type ActionRow = PrismaAction

export type ReviewRow = PrismaPocReview & {
  checklistResponses: ChecklistResponseRecord[]
}

export type RiskRow = PrismaRisk

export type AuditRow = PrismaAuditLog

export type KdaRow = PrismaKdaDecision

export type SessionRow = PrismaPocSession & {
  sessionProjects: SessionProject[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert a Date to ISO string, or return empty string for null/undefined */
function dateToString(value: Date | null | undefined): string {
  return value ? value.toISOString() : ''
}

/** Convert null to undefined for optional fields */
function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value
}

// ─── Mapper Functions ────────────────────────────────────────────────────────

export function mapProfile(row: ProfileRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    cluster: nullToUndefined(row.cluster),
    impactArea: nullToUndefined(row.impactArea),
    passwordChanged: row.passwordChanged ?? false,
  }
}

export function mapProject(row: ProjectRow): Project {
  const rag: RAGDimensions = {
    overall: row.ragOverall ?? 'GREEN',
    scope: row.ragScope ?? 'GREEN',
    schedule: row.ragSchedule ?? 'GREEN',
    cost: row.ragCost ?? 'GREEN',
    quality: row.ragQuality ?? 'GREEN',
    risk: row.ragRisk ?? 'GREEN',
    sheq: row.ragSheq ?? 'GREEN',
    data: row.ragData ?? 'GREEN',
    compliance: row.ragCompliance ?? 'GREEN',
  }

  return {
    id: row.id,
    shortTitle: row.shortTitle,
    longTitle: row.longTitle,
    classification: row.classification,
    cluster: row.cluster,
    impactArea: row.impactArea,
    pmId: row.pmId,
    sponsorName: row.sponsorName,
    strategicObjectives: row.strategicObjectives,
    contractValue: row.contractValue?.toNumber() ?? 0,
    contractTerm: row.contractTerm ?? 0,
    startDate: dateToString(row.startDate),
    endDate: dateToString(row.endDate),
    thisYearAmount: row.thisYearAmount?.toNumber() ?? 0,
    riskComplexity: row.riskComplexity ?? 'LOW',
    reputationalRisk: row.reputationalRisk ?? 'LOW',
    rag,
    healthNarrative: row.healthNarrative ?? '',
    lastUpdated: dateToString(row.lastUpdated),
  }
}

export function mapAction(row: ActionRow): Action {
  return {
    id: row.id,
    projectId: row.projectId,
    reviewId: nullToUndefined(row.reviewId),
    description: row.description,
    owner: row.owner,
    dueDate: dateToString(row.dueDate),
    status: row.status,
    category: row.category,
    evidenceLinks: row.evidenceLinks,
  }
}

export function mapReview(row: ReviewRow): POCReview {
  return {
    id: row.id,
    projectId: row.projectId,
    reviewDate: dateToString(row.reviewDate),
    committeeType: row.committeeType,
    attendees: row.attendees,
    checklistResponses: row.checklistResponses.map(mapChecklistItem),
    findingsSummary: row.findingsSummary ?? '',
    escalation: row.escalation ?? false,
    outcome: row.outcome ?? 'APPROVED',
  }
}

function mapChecklistItem(record: ChecklistResponseRecord): ChecklistItem {
  return {
    id: record.id,
    section: record.section,
    item: record.item,
    response: record.response ?? null,
    comment: record.comment ?? '',
    evidenceLinks: record.evidenceLinks,
    actionRequired: record.actionRequired ?? false,
  }
}

export function mapRisk(row: RiskRow): RiskIssue {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    type: row.type,
    likelihood: row.likelihood ?? 'LOW',
    impact: row.impact ?? 'LOW',
    ragStatus: row.ragStatus ?? 'GREEN',
    mitigation: row.mitigation ?? '',
    owner: row.owner,
    status: row.status,
  }
}

export function mapAudit(row: AuditRow): AuditEntry {
  return {
    id: row.id,
    projectId: row.projectId,
    timestamp: row.timestamp.toISOString(),
    actor: row.actor,
    type: row.type,
    description: row.description,
    oldValue: nullToUndefined(row.oldValue),
    newValue: nullToUndefined(row.newValue),
  }
}

export function mapKda(row: KdaRow): KDADecision {
  return {
    id: row.id,
    projectId: row.projectId,
    gateName: row.gateName,
    stage: row.stage,
    submissionStatus: row.submissionStatus,
    decision: row.decision ?? 'APPROVED',
    notes: row.notes ?? '',
    signedOffBy: row.signedOffBy,
    date: dateToString(row.date),
  }
}

export function mapSession(row: SessionRow): POCSession {
  return {
    id: row.id,
    date: dateToString(row.date),
    committeeType: row.committeeType,
    projectIds: row.sessionProjects.map((sp) => sp.projectId),
    status: row.status,
    attendees: row.attendees,
  }
}
