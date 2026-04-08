// SSoc Framework - Constants & Reference Data

// CLUSTERS, IMPACT_AREAS, and STRATEGIC_OBJECTIVES are managed exclusively
// in the Supabase database. These empty exports remain for type compatibility
// but must NEVER contain seed data.
export const CLUSTERS = [] as const
export const IMPACT_AREAS: Record<string, string[]> = {}
export const STRATEGIC_OBJECTIVES = [] as const

export const CLASSIFICATION_THRESHOLDS = {
  A: {
    contractValue: 50,
    riskComplexity: "HIGH",
    reputationalRisk: "HIGH",
  },
  B: {
    contractValue: 10,
    riskComplexity: "MEDIUM",
    reputationalRisk: "MEDIUM",
  },
  C: {
    contractValue: 0,
    riskComplexity: "LOW",
    reputationalRisk: "LOW",
  },
} as const

export const POC_CADENCE = {
  A: {
    label: "Divisional Oversight Committee",
    frequency: "Biannual (Q2 & Q4)",
    quarters: [2, 4],
  },
  B: {
    label: "Cluster Oversight Committee",
    frequency: "Biannual (Q2 minimum)",
    quarters: [2],
  },
  C: {
    label: "Impact Area/Centre Oversight",
    frequency: "Biannual (Q2 minimum)",
    quarters: [2],
  },
} as const

export const CHECKLIST_TEMPLATE = [
  {
    section: "Project Overview",
    items: [
      "Project objectives are clearly defined and up to date",
      "Scope is aligned with the approved project charter/contract",
      "Project deliverables are on track for the current phase",
      "Stakeholder mapping and engagement plan is in place",
    ],
  },
  {
    section: "Governance",
    items: [
      "Project governance structure is established and functional",
      "Reporting lines and escalation paths are clear",
      "Project steering committee/sponsor is actively engaged",
      "Classification and KDA decisions are current and documented",
    ],
  },
  {
    section: "Business Case",
    items: [
      "Business case remains valid and is reviewed periodically",
      "Benefits realisation tracking is in place",
      "Project aligns with SSoc strategic objectives (SO1-SO5)",
    ],
  },
  {
    section: "Risk Management",
    items: [
      "Risk register is maintained and reviewed regularly",
      "Top risks have mitigation plans with assigned owners",
      "Risk escalation triggers are defined",
      "Issues are being tracked and resolved within SLA",
    ],
  },
  {
    section: "Project Plan / Milestones",
    items: [
      "Project plan/schedule is current and baselined",
      "Milestone tracking shows acceptable variance",
      "Dependencies are identified and managed",
      "Change control process is followed for scope changes",
    ],
  },
  {
    section: "Budget & Cost Management",
    items: [
      "Budget vs actual expenditure is within tolerance",
      "Forecasting is current and reflects known changes",
      "Contract financial terms are being met",
      "Procurement activities are compliant",
    ],
  },
  {
    section: "Compliance",
    items: [
      "Data Management Plan (DMP) is in place and current",
      "Record of Processing Activities (ROPA) is maintained",
      "SHEQ requirements are documented and monitored",
      "Regulatory and legal compliance obligations are tracked",
    ],
  },
] as const

export const ACTION_CATEGORIES = [
  { value: "GOVERNANCE", label: "Governance" },
  { value: "RISK", label: "Risk" },
  { value: "SHEQ", label: "SHEQ" },
  { value: "COMPLIANCE", label: "Compliance" },
  { value: "DATA", label: "Data" },
  { value: "CONTRACT", label: "Contract" },
  { value: "SCHEDULE", label: "Schedule" },
  { value: "FINANCE", label: "Finance" },
] as const

export const RAG_LABELS: Record<string, string> = {
  RED: "Red",
  AMBER: "Amber",
  GREEN: "Green",
}

export const DIMENSION_LABELS: Record<string, string> = {
  scope: "Scope",
  schedule: "Schedule",
  cost: "Cost",
  quality: "Quality",
  risk: "Risk",
  sheq: "SHEQ",
  data: "Data",
  compliance: "Compliance",
}

export const REVIEW_OUTCOMES = [
  { value: "APPROVED", label: "Approved" },
  { value: "APPROVED_WITH_ACTIONS", label: "Approved with Actions" },
  { value: "REJECTED", label: "Rejected" },
  { value: "DEFERRED", label: "Deferred" },
] as const

export const COMMITTEE_TYPE_LABELS: Record<string, string> = {
  DIVISIONAL: "Divisional",
  CLUSTER: "Cluster",
  IMPACT_AREA: "Impact Area",
}
