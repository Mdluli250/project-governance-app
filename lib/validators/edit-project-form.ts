/**
 * Pure validation function for the Edit Project form.
 * Returns a record of field names to error messages.
 * An empty object indicates the form is valid.
 */

export interface EditProjectFormState {
  shortTitle: string
  longTitle: string
  cluster: string
  impactArea: string
  pmId: string
  sponsorName: string
  strategicObjectives: string[]
  contractValue: string
  contractTerm: string
  thisYearAmount: string
  startDate: string
  endDate: string
  riskComplexity: string
  reputationalRisk: string
  healthNarrative: string
}

export type ValidationErrors = Record<string, string>

export function validateEditProjectForm(form: EditProjectFormState): ValidationErrors {
  const errors: ValidationErrors = {}

  // Required fields
  if (!form.shortTitle.trim()) {
    errors.shortTitle = "Short title is required"
  } else if (form.shortTitle.length > 100) {
    errors.shortTitle = "Short title must be 100 characters or less"
  }

  if (form.longTitle.length > 255) {
    errors.longTitle = "Long title must be 255 characters or less"
  }

  if (!form.cluster.trim()) {
    errors.cluster = "Cluster is required"
  }

  if (!form.pmId.trim()) {
    errors.pmId = "Project manager is required"
  }

  if (form.sponsorName.length > 100) {
    errors.sponsorName = "Sponsor name must be 100 characters or less"
  }

  // Numeric range validations (only validate when value is non-empty)
  if (form.contractValue !== "") {
    const cv = Number(form.contractValue)
    if (isNaN(cv) || cv < 0 || cv > 999999.9) {
      errors.contractValue = "Contract value must be between 0 and 999,999.9"
    }
  }

  if (form.contractTerm !== "") {
    const ct = Number(form.contractTerm)
    if (isNaN(ct) || !Number.isInteger(ct) || ct < 0 || ct > 600) {
      errors.contractTerm = "Contract term must be between 0 and 600 months"
    }
  }

  if (form.thisYearAmount !== "") {
    const tya = Number(form.thisYearAmount)
    if (isNaN(tya) || tya < 0 || tya > 999999.9) {
      errors.thisYearAmount = "This year amount must be between 0 and 999,999.9"
    }
  }

  // Date ordering: endDate must be >= startDate when both are set
  if (form.startDate && form.endDate) {
    if (form.endDate < form.startDate) {
      errors.endDate = "End date cannot be before start date"
    }
  }

  if (form.healthNarrative.length > 2000) {
    errors.healthNarrative = "Health narrative must be 2000 characters or less"
  }

  return errors
}
