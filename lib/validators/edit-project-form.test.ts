import { describe, it, expect } from "vitest"
import {
  validateEditProjectForm,
  type EditProjectFormState,
} from "./edit-project-form"

function validForm(): EditProjectFormState {
  return {
    shortTitle: "Test Project",
    longTitle: "Test Project Long Title",
    cluster: "Infrastructure",
    impactArea: "Water",
    pmId: "user-1",
    sponsorName: "John Doe",
    strategicObjectives: ["so-1"],
    contractValue: "50",
    contractTerm: "12",
    thisYearAmount: "10",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    riskComplexity: "LOW",
    reputationalRisk: "LOW",
    healthNarrative: "Project is healthy.",
  }
}

describe("validateEditProjectForm", () => {
  describe("valid form", () => {
    it("returns no errors for a fully valid form", () => {
      const errors = validateEditProjectForm(validForm())
      expect(errors).toEqual({})
    })

    it("returns no errors when optional fields are empty", () => {
      const form = validForm()
      form.longTitle = ""
      form.sponsorName = ""
      form.contractValue = ""
      form.contractTerm = ""
      form.thisYearAmount = ""
      form.startDate = ""
      form.endDate = ""
      form.healthNarrative = ""
      const errors = validateEditProjectForm(form)
      expect(errors).toEqual({})
    })
  })

  describe("required fields", () => {
    it("returns error when shortTitle is empty", () => {
      const form = validForm()
      form.shortTitle = ""
      const errors = validateEditProjectForm(form)
      expect(errors.shortTitle).toBe("Short title is required")
    })

    it("returns error when shortTitle is only whitespace", () => {
      const form = validForm()
      form.shortTitle = "   "
      const errors = validateEditProjectForm(form)
      expect(errors.shortTitle).toBe("Short title is required")
    })

    it("returns error when cluster is empty", () => {
      const form = validForm()
      form.cluster = ""
      const errors = validateEditProjectForm(form)
      expect(errors.cluster).toBe("Cluster is required")
    })

    it("returns error when pmId is empty", () => {
      const form = validForm()
      form.pmId = ""
      const errors = validateEditProjectForm(form)
      expect(errors.pmId).toBe("Project manager is required")
    })
  })

  describe("max length validations", () => {
    it("returns error when shortTitle exceeds 100 chars", () => {
      const form = validForm()
      form.shortTitle = "a".repeat(101)
      const errors = validateEditProjectForm(form)
      expect(errors.shortTitle).toBe("Short title must be 100 characters or less")
    })

    it("returns error when longTitle exceeds 255 chars", () => {
      const form = validForm()
      form.longTitle = "a".repeat(256)
      const errors = validateEditProjectForm(form)
      expect(errors.longTitle).toBe("Long title must be 255 characters or less")
    })

    it("returns error when sponsorName exceeds 100 chars", () => {
      const form = validForm()
      form.sponsorName = "a".repeat(101)
      const errors = validateEditProjectForm(form)
      expect(errors.sponsorName).toBe("Sponsor name must be 100 characters or less")
    })

    it("returns error when healthNarrative exceeds 2000 chars", () => {
      const form = validForm()
      form.healthNarrative = "a".repeat(2001)
      const errors = validateEditProjectForm(form)
      expect(errors.healthNarrative).toBe("Health narrative must be 2000 characters or less")
    })
  })

  describe("numeric range validations", () => {
    it("returns error when contractValue is negative", () => {
      const form = validForm()
      form.contractValue = "-1"
      const errors = validateEditProjectForm(form)
      expect(errors.contractValue).toBe("Contract value must be between 0 and 999,999.9")
    })

    it("returns error when contractValue exceeds 999999.9", () => {
      const form = validForm()
      form.contractValue = "1000000"
      const errors = validateEditProjectForm(form)
      expect(errors.contractValue).toBe("Contract value must be between 0 and 999,999.9")
    })

    it("returns error when contractValue is not a number", () => {
      const form = validForm()
      form.contractValue = "abc"
      const errors = validateEditProjectForm(form)
      expect(errors.contractValue).toBe("Contract value must be between 0 and 999,999.9")
    })

    it("returns error when contractTerm is negative", () => {
      const form = validForm()
      form.contractTerm = "-1"
      const errors = validateEditProjectForm(form)
      expect(errors.contractTerm).toBe("Contract term must be between 0 and 600 months")
    })

    it("returns error when contractTerm exceeds 600", () => {
      const form = validForm()
      form.contractTerm = "601"
      const errors = validateEditProjectForm(form)
      expect(errors.contractTerm).toBe("Contract term must be between 0 and 600 months")
    })

    it("returns error when contractTerm is not an integer", () => {
      const form = validForm()
      form.contractTerm = "12.5"
      const errors = validateEditProjectForm(form)
      expect(errors.contractTerm).toBe("Contract term must be between 0 and 600 months")
    })

    it("returns error when thisYearAmount is negative", () => {
      const form = validForm()
      form.thisYearAmount = "-1"
      const errors = validateEditProjectForm(form)
      expect(errors.thisYearAmount).toBe("This year amount must be between 0 and 999,999.9")
    })

    it("returns error when thisYearAmount exceeds 999999.9", () => {
      const form = validForm()
      form.thisYearAmount = "1000000"
      const errors = validateEditProjectForm(form)
      expect(errors.thisYearAmount).toBe("This year amount must be between 0 and 999,999.9")
    })
  })

  describe("date ordering", () => {
    it("returns error when endDate is before startDate", () => {
      const form = validForm()
      form.startDate = "2024-06-01"
      form.endDate = "2024-01-01"
      const errors = validateEditProjectForm(form)
      expect(errors.endDate).toBe("End date cannot be before start date")
    })

    it("no error when endDate equals startDate", () => {
      const form = validForm()
      form.startDate = "2024-06-01"
      form.endDate = "2024-06-01"
      const errors = validateEditProjectForm(form)
      expect(errors.endDate).toBeUndefined()
    })

    it("no error when only startDate is set", () => {
      const form = validForm()
      form.startDate = "2024-06-01"
      form.endDate = ""
      const errors = validateEditProjectForm(form)
      expect(errors.endDate).toBeUndefined()
    })

    it("no error when only endDate is set", () => {
      const form = validForm()
      form.startDate = ""
      form.endDate = "2024-06-01"
      const errors = validateEditProjectForm(form)
      expect(errors.endDate).toBeUndefined()
    })
  })

  describe("multiple errors", () => {
    it("returns all errors when multiple fields are invalid", () => {
      const form = validForm()
      form.shortTitle = ""
      form.cluster = ""
      form.pmId = ""
      form.contractValue = "-5"
      const errors = validateEditProjectForm(form)
      expect(Object.keys(errors)).toHaveLength(4)
      expect(errors.shortTitle).toBeDefined()
      expect(errors.cluster).toBeDefined()
      expect(errors.pmId).toBeDefined()
      expect(errors.contractValue).toBeDefined()
    })
  })
})
