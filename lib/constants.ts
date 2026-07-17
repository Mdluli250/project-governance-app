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
