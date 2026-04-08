"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  FolderKanban,
  CalendarCheck,
  ClipboardCheck,
  Gavel,
  ListChecks,
  BarChart3,
  Shield,
  Users,
  Settings,
  ArrowRight,
  CircleDot,
  AlertTriangle,
  CheckCircle2,
  Printer,
  ExternalLink,
} from "lucide-react"

const workflowSteps = [
  {
    number: "1",
    title: "System Setup & Configuration",
    icon: Settings,
    roleRequired: "Admin",
    description:
      "Before any projects can be managed, an Administrator configures the system foundations. This includes setting up Clusters and Impact Areas that define the organisational structure, Strategic Objectives (SO1-SO5) that projects align to, the Oversight Checklist Template used in all POC reviews, Action Categories for tracking follow-up items, and Classification Rules that determine how projects are categorised.",
    details: [
      "Navigate to Administration > Configuration",
      "Configure Clusters (e.g. Smart Places, Smart Health) and their Impact Areas",
      "Review and customise the Checklist Template sections and items",
      "Set up Strategic Objectives that projects will be mapped against",
      "Define Action Categories (Governance, Risk, SHEQ, Compliance, Data, Contract, Schedule, Finance)",
    ],
  },
  {
    number: "2",
    title: "User Management",
    icon: Users,
    roleRequired: "Admin",
    description:
      "The Admin creates user accounts and assigns roles. Each role determines what actions a user can perform across the system. Roles include Project Manager (PM), POC Member, POC Chair, and Admin.",
    details: [
      "Navigate to Administration > Users",
      "Add users with their name, email, role, and optionally assign to a Cluster/Impact Area",
      "PM: Can edit project data, create new projects, and submit review packs",
      "POC Member: Can complete checklists and create actions during sessions",
      "POC Chair: Can record decisions, create sessions, manage attendees, and edit completed checklists",
      "Admin: Full system access including configuration, user management, and all data editing",
    ],
  },
  {
    number: "3",
    title: "Project Registration & Data Entry",
    icon: FolderKanban,
    roleRequired: "PM / Admin",
    description:
      "Project Managers and Admins register new projects and maintain the Portfolio Register. Each project captures key metadata including titles, classification inputs (contract value, risk complexity, reputational risk), cluster/impact area assignment, strategic objective alignment, financial data, and the RAG (Red/Amber/Green) health status across 8 dimensions: Scope, Schedule, Cost, Quality, Risk, SHEQ, Data, and Compliance. All data is persisted to the database and survives login/logout and page refreshes.",
    details: [
      "Navigate to Portfolio Register and click 'New Project' to create a project (visible for PM and Admin roles)",
      "Fill in all required fields: titles, cluster, impact area, PM assignment, contract financials, dates, and risk ratings",
      "The system auto-classifies projects (A/B/C) based on the '2 of 3' rule using contract value, risk complexity, and reputational risk",
      "Select a project from the register to view and edit its details via the Project Detail tabs",
      "Project Detail tabs: Overview, Health, Reviews, Checklist, Risks, and Actions",
      "Set RAG status for each of the 8 dimensions plus overall RAG in the Health tab",
      "Update the Health Narrative with a current status summary",
      "Manage the Risk & Issues register for each project in the Risks tab",
      "Classification A = Divisional oversight (Q2 & Q4), B = Cluster oversight (Q2), C = Impact Area oversight (Q2)",
    ],
  },
  {
    number: "4",
    title: "Create a POC Session",
    icon: CalendarCheck,
    roleRequired: "POC Chair / Admin",
    description:
      "When a review cycle is due, the POC Chair or Admin creates a new POC (Project Oversight Committee) Session. The session is assigned a committee type (Divisional, Cluster, or Impact Area), a date, and one or more projects to be reviewed in that session.",
    details: [
      "Navigate to Committees > POC Sessions",
      "Click 'New Session' and select the Committee Type",
      "Set the session date and select projects for the agenda",
      "The session starts in DRAFT status",
      "Open the Session Workspace to begin the review process",
    ],
  },
  {
    number: "5",
    title: "Manage Attendees & Start the Session",
    icon: Users,
    roleRequired: "POC Chair / Admin",
    description:
      "Within the Session Workspace, the Chair first adds committee attendees to the session. Attendees are selected from the registered users list and their names are recorded as part of the session record. When the review is submitted, the session attendees are automatically included in the review record. The Chair then starts the session, moving it from DRAFT to IN PROGRESS.",
    details: [
      "In the Session Workspace header, click 'Add' next to the Attendees label",
      "Select committee members from the user dropdown to add them as attendees",
      "Remove attendees by clicking the X on their name badge",
      "Attendees are persisted and visible to all users viewing the session",
      "Click 'Start Session' to move status from Draft to In Progress",
      "The attendees list is included in all reviews submitted during this session",
    ],
  },
  {
    number: "6",
    title: "Review Projects & Complete the Checklist",
    icon: ClipboardCheck,
    roleRequired: "POC Member / POC Chair / Admin",
    description:
      "The committee reviews each project on the agenda one by one using the Session Workspace. For each project, the committee works through the Oversight Checklist, marking each item as Yes, No, or Partial, adding comments where needed, and flagging items that require follow-up actions. Each checklist section also includes two SharePoint link fields at the bottom for attaching relevant documentation.",
    details: [
      "Use the project navigation (Previous/Next) to move through the agenda",
      "For each project, review the project overview panel showing current RAG status, classification, and existing actions/risks",
      "Complete the Oversight Checklist item by item across all sections (Project Overview, Governance, Business Case, etc.)",
      "For each item: select Yes/No/Partial, add a comment, and toggle 'Action required' if needed",
      "At the bottom of each section, add up to two SharePoint URLs using the Link 1 and Link 2 fields for evidence/reference documents",
      "Use the Print / PDF button on the Checklist to generate a print-friendly version for records",
      "POC Members, POC Chair, and Admin can complete the checklist",
    ],
  },
  {
    number: "7",
    title: "Record Findings & Decision",
    icon: Gavel,
    roleRequired: "POC Chair / Admin",
    description:
      "After the checklist review, the POC Chair records the findings summary and selects the formal review outcome for each project. The outcome options are: Approved, Approved with Actions, Rejected, or Deferred. The Chair can also flag the review for escalation if required. Session attendees are automatically recorded on the review.",
    details: [
      "Enter the Findings Summary describing key observations from the review",
      "Select the Review Outcome: Approved, Approved with Actions, Rejected, or Deferred",
      "Toggle the Escalation flag if the project needs to be escalated to a higher committee",
      "Click 'Submit Review' to formally record the POC review decision",
      "The review is saved with the session attendees, checklist responses, findings, and outcome",
      "All submitted reviews appear in the project's Reviews tab in Project Detail",
    ],
  },
  {
    number: "8",
    title: "Raise Actions",
    icon: ListChecks,
    roleRequired: "POC Member / POC Chair / Admin",
    description:
      "During or after the review, committee members can raise Actions against the project. Actions track follow-up items that need to be addressed, with an assigned owner, due date, category, and status. Actions can be created from the Session Workspace or the Project Detail view.",
    details: [
      "Click 'Add Action' in the Session Workspace or Project Detail > Actions tab",
      "Provide a description of what needs to be done",
      "Assign an owner responsible for the action",
      "Set a due date for completion",
      "Categorise the action (Governance, Risk, SHEQ, Compliance, Data, Contract, Schedule, Finance)",
      "Actions start as OPEN and can be moved to IN PROGRESS or CLOSED",
      "Overdue actions are highlighted on the Dashboard and project views",
    ],
  },
  {
    number: "9",
    title: "Complete the Session & Print Report",
    icon: CheckCircle2,
    roleRequired: "POC Chair / Admin",
    description:
      "Once all projects on the agenda have been reviewed and decisions recorded, the POC Chair completes the session. This moves the session to COMPLETED status. A comprehensive session report can be generated at any time using the Print / PDF button, which produces a print-optimised document with session details, attendees, portfolio summary, and per-project breakdowns.",
    details: [
      "Ensure all projects in the session have submitted reviews",
      "Click 'Complete Session' to finalise",
      "The session moves from IN PROGRESS to COMPLETED",
      "All review data, checklists, decisions, actions, and attendees are preserved in the database",
      "Click 'Print / PDF' in the session header to generate a comprehensive report",
      "The report includes: session header, attendee list, portfolio summary table, and per-project detail pages with RAG status, risks, actions, and review history",
      "Use your browser's 'Save as PDF' option in the print dialog to save a PDF copy",
      "Admin and POC Chair can reopen checklists for editing on completed sessions if corrections are needed",
    ],
  },
  {
    number: "10",
    title: "Ongoing Monitoring & Dashboard",
    icon: BarChart3,
    roleRequired: "All Roles",
    description:
      "The Executive Portfolio Dashboard provides a real-time overview of all projects. It shows summary cards, RAG distribution charts, and an attention panel highlighting projects that need immediate focus. Users can filter by classification, cluster, PM, or strategic objective. The Portfolio Register provides a sortable, filterable table of all projects with quick access to each project's detail page.",
    details: [
      "The Dashboard shows portfolio-wide KPIs: total projects, classifications, RAG breakdown",
      "RAG Distribution Chart visualises health across all dimensions",
      "Attention Panel flags projects with Red RAG status, overdue reviews, or overdue actions",
      "Portfolio Register provides a sortable, filterable table of all projects with a 'New Project' button for PMs and Admins",
      "Each Project Detail page shows tabs for: Overview, Health, Reviews, Checklist, Risks, and Actions",
      "The Reviews tab displays review history including attendees, findings, outcome, and escalation status",
    ],
  },
]

const rolePermissions = [
  {
    role: "Project Manager (PM)",
    colour: "bg-accent/15 text-accent border-accent/30",
    permissions: [
      "Create new projects via the Portfolio Register",
      "Edit project data (metadata, RAG status, health narrative, risks)",
      "Submit review packs",
      "View assigned projects",
    ],
  },
  {
    role: "POC Member",
    colour: "bg-primary/15 text-primary border-primary/30",
    permissions: [
      "Complete oversight checklists during sessions (including SharePoint links)",
      "Create and manage actions",
      "View projects in sessions",
    ],
  },
  {
    role: "POC Chair",
    colour: "bg-rag-amber/15 text-rag-amber border-rag-amber/30",
    permissions: [
      "All POC Member permissions",
      "Create and manage POC Sessions",
      "Add and remove session attendees",
      "Record review decisions (Approve/Reject/Defer)",
      "Edit completed checklists (reopen for corrections)",
      "Print session reports and checklist reports",
      "View all projects across the portfolio",
    ],
  },
  {
    role: "Admin",
    colour: "bg-rag-green/15 text-rag-green border-rag-green/30",
    permissions: [
      "All POC Chair permissions",
      "System Configuration (Clusters, Objectives, Checklist Template, etc.)",
      "User Management (create, edit users and assign roles)",
      "Create new projects via the Portfolio Register",
      "Full access to all areas of the application",
    ],
  },
]

const classificationInfo = [
  {
    classification: "A",
    label: "Class A - Divisional Oversight",
    criteria: "2 of 3: Contract >= R50M, High Risk/Complexity, High Reputational Risk",
    cadence: "Biannual review (Q2 & Q4)",
    committee: "Divisional Oversight Committee",
  },
  {
    classification: "B",
    label: "Class B - Cluster Oversight",
    criteria: "2 of 3: Contract >= R10M, Medium Risk/Complexity, Medium Reputational Risk",
    cadence: "Biannual review (Q2 minimum)",
    committee: "Cluster Oversight Committee",
  },
  {
    classification: "C",
    label: "Class C - Impact Area Oversight",
    criteria: "Remaining projects not meeting A or B thresholds",
    cadence: "Biannual review (Q2 minimum)",
    committee: "Impact Area/Centre Oversight Committee",
  },
]

export default function HelpPage() {
  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-balance">
          Application Help Guide
        </h1>
        <p className="text-sm text-muted-foreground">
          Step-by-step guide to using the SSoc Governance Project Management Framework, from initial setup through to project oversight and sign-off.
        </p>
      </div>

      {/* Quick Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="size-5 text-primary" />
            How the Application Works
          </CardTitle>
          <CardDescription>
            The SSoc Governance Framework manages the full lifecycle of project oversight. Projects are registered in the Portfolio, reviewed by oversight committees in formal POC Sessions, and tracked through decisions, actions, and reporting. All data is persisted to the database and available across sessions and logins.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <CircleDot className="size-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-foreground">
                <span className="font-semibold">Setup:</span> Admin configures the system (clusters, objectives, checklists, users).
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CircleDot className="size-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-foreground">
                <span className="font-semibold">Register:</span> PMs and Admins create and maintain project data in the Portfolio Register using the "New Project" button.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CircleDot className="size-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-foreground">
                <span className="font-semibold">Review:</span> POC Chair creates oversight sessions, adds attendees, and the committee reviews projects against the checklist with SharePoint link support.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CircleDot className="size-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-foreground">
                <span className="font-semibold">Decide:</span> The Chair records formal decisions (Approved, Approved with Actions, Rejected, Deferred) with attendees automatically included.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CircleDot className="size-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-foreground">
                <span className="font-semibold">Track & Report:</span> Actions are raised and tracked to completion. The Dashboard provides ongoing portfolio monitoring. Session and checklist reports can be printed or saved as PDF.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step-by-Step Workflow */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold tracking-tight">Step-by-Step Workflow</h2>
        <div className="flex flex-col gap-4">
          {workflowSteps.map((step) => {
            const Icon = step.icon
            return (
              <Card key={step.number}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-4">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
                      {step.number}
                    </div>
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Icon className="size-4 text-muted-foreground" />
                          {step.title}
                        </CardTitle>
                        <Badge variant="outline" className="text-[10px]">
                          {step.roleRequired}
                        </Badge>
                      </div>
                      <CardDescription className="text-sm leading-relaxed">
                        {step.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pl-[3.75rem]">
                  <ul className="flex flex-col gap-1.5">
                    {step.details.map((detail, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <ArrowRight className="size-3.5 text-accent mt-0.5 shrink-0" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <Separator />

      {/* Key Features */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold tracking-tight">Key Features</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Printer className="size-4 text-muted-foreground" />
                Print / Save as PDF
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground leading-relaxed">
              Two print functions are available. The <span className="font-medium text-foreground">Session Workspace</span> has a "Print / PDF" button in the header that generates a comprehensive session report with attendees, portfolio summary, and per-project detail pages. The <span className="font-medium text-foreground">Oversight Checklist</span> has its own "Print / PDF" button that produces a tabular checklist report. Both open a print dialog where you can use "Save as PDF" to create a PDF file.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ExternalLink className="size-4 text-muted-foreground" />
                SharePoint Links
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground leading-relaxed">
              Each section of the Oversight Checklist (Project Overview, Governance, Business Case, etc.) includes two SharePoint URL link fields (Link 1 and Link 2) at the bottom of the section. These are used to attach relevant SharePoint documents as evidence or reference material. Links are editable during checklist completion and appear as clickable hyperlinks in read-only mode and on printed reports.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="size-4 text-muted-foreground" />
                Session Attendees
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground leading-relaxed">
              POC Sessions track committee attendees. The POC Chair or Admin adds attendees from the registered users list using the "Add" button in the Session Workspace header. Attendees are displayed as badges and can be removed. When a review is submitted, the session attendees are automatically recorded on the review and displayed in the Project Detail Reviews tab.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FolderKanban className="size-4 text-muted-foreground" />
                New Project Creation
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground leading-relaxed">
              PMs and Admins can create new projects directly from the Portfolio Register page using the "New Project" button. The creation form captures all required fields including titles, cluster, impact area, PM assignment, contract financials, dates, and risk/complexity ratings. The system auto-classifies the project using the "2 of 3" rule as you enter the data.
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      {/* Project Classification Reference */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold tracking-tight">Project Classification Reference</h2>
        <p className="text-sm text-muted-foreground">
          Projects are automatically classified using the SSoc "2 of 3" rule based on contract value, risk/complexity, and reputational risk. The classification determines the oversight committee level and review cadence.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {classificationInfo.map((cls) => (
            <Card key={cls.classification}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      cls.classification === "A"
                        ? "bg-rag-red/10 text-rag-red border-rag-red/30"
                        : cls.classification === "B"
                          ? "bg-rag-amber/10 text-rag-amber border-rag-amber/30"
                          : "bg-rag-green/10 text-rag-green border-rag-green/30"
                    }
                  >
                    {cls.classification}
                  </Badge>
                  {cls.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">{cls.criteria}</p>
                <div className="flex flex-col gap-1 text-xs">
                  <span className="text-foreground font-medium">{cls.cadence}</span>
                  <span className="text-muted-foreground">{cls.committee}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      {/* Project Detail Tabs */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold tracking-tight">Project Detail Tabs</h2>
        <p className="text-sm text-muted-foreground">
          Each project in the Portfolio Register has a detail page with the following tabs:
        </p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[
            { tab: "Overview", desc: "Project metadata, classification, cluster, strategic objectives, contract details, and key dates." },
            { tab: "Health", desc: "RAG status across 8 dimensions (Scope, Schedule, Cost, Quality, Risk, SHEQ, Data, Compliance), overall RAG, and the health narrative." },
            { tab: "Reviews", desc: "History of all POC reviews including attendees, findings summary, outcome decision, and escalation status." },
            { tab: "Checklist", desc: "The latest Oversight Checklist with responses, comments, action flags, SharePoint links, and Print/PDF functionality." },
            { tab: "Risks", desc: "Risk and Issue register with likelihood, impact, RAG status, mitigation plans, owners, and status tracking." },
            { tab: "Actions", desc: "Follow-up actions with description, owner, due date, category, status, and overdue highlighting." },
          ].map((t) => (
            <Card key={t.tab}>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm">{t.tab}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed">{t.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      {/* Role Permissions */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold tracking-tight">Role Permissions</h2>
        <p className="text-sm text-muted-foreground">
          The system uses role-based access control (RBAC). Each user is assigned one of four roles that determines their permissions.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {rolePermissions.map((rp) => (
            <Card key={rp.role}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Badge variant="outline" className={rp.colour}>
                    {rp.role}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-1.5">
                  {rp.permissions.map((perm, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="size-3.5 text-rag-green mt-0.5 shrink-0" />
                      <span>{perm}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      {/* FAQ */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold tracking-tight">Frequently Asked Questions</h2>
        <Card>
          <CardContent className="pt-6">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="q1">
                <AccordionTrigger className="text-sm text-left">
                  How is a project classification determined?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  Project classification uses the SSoc "2 of 3" rule. The system evaluates three factors: contract value (A: R50M+, B: R10M+), risk/complexity level (High, Medium, Low), and reputational risk (High, Medium, Low). If 2 or more factors meet the Class A threshold, the project is Class A. If the combination meets Class B but not A, it is Class B. All remaining projects default to Class C. Classification is automatically calculated when creating a new project or editing classification inputs.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q2">
                <AccordionTrigger className="text-sm text-left">
                  What do the RAG colours mean?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  RAG stands for Red, Amber, Green and indicates health status. Red means significant issues requiring immediate attention, Amber means caution with some concerns that need monitoring, and Green means the dimension is on track with no major concerns. RAG is assessed across 8 dimensions: Scope, Schedule, Cost, Quality, Risk, SHEQ, Data, and Compliance, plus an overall status derived from the worst dimension.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q3">
                <AccordionTrigger className="text-sm text-left">
                  Can a completed checklist be edited after submission?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  Yes. Admin and POC Chair roles have the ability to reopen a completed checklist for editing. In the Session Workspace, a "Reopen Checklist for Editing" button appears for these roles on completed sessions. On the Project Detail page, the Checklist tab is also editable for Admin and POC Chair.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q4">
                <AccordionTrigger className="text-sm text-left">
                  What are the review outcome options?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  The POC Chair can record one of four outcomes: <strong>Approved</strong> (project proceeds without conditions), <strong>Approved with Actions</strong> (project proceeds but follow-up actions must be completed), <strong>Rejected</strong> (project cannot proceed in current form), or <strong>Deferred</strong> (decision is postponed pending further information).
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q5">
                <AccordionTrigger className="text-sm text-left">
                  How do I switch between user roles for testing?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  Use the role switcher in the sidebar header. Click the current user name/role to open a dropdown showing all available users. Select a different user to switch roles and see the application from that perspective. Different roles will show different capabilities and UI options.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q6">
                <AccordionTrigger className="text-sm text-left">
                  What triggers the Attention Panel on the Dashboard?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  The Attention Panel highlights projects that need immediate focus based on three criteria: any RAG dimension set to Red, POC review overdue (past the scheduled review date based on classification cadence), or open actions that are past their due date. Projects meeting any of these criteria are flagged with specific reasons.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q7">
                <AccordionTrigger className="text-sm text-left">
                  How do I add a new project?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  Navigate to the Portfolio Register page. If you are logged in as a PM or Admin, you will see a "New Project" button in the top-right corner. Click it to open the project creation form. Fill in all required fields including titles, cluster, impact area, PM assignment, contract financials, dates, and risk ratings. The classification is automatically calculated as you enter the risk and financial data.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q8">
                <AccordionTrigger className="text-sm text-left">
                  How do I print a session report or checklist?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  For a session report, open the Session Workspace and click the "Print / PDF" button in the header. This opens a new window with a comprehensive, print-optimised report. For a checklist report, navigate to the Checklist tab (in Project Detail or Session Workspace) and click the "Print / PDF" button in the checklist summary bar. In both cases, your browser's print dialog opens where you can print directly or choose "Save as PDF" to download a PDF file.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q9">
                <AccordionTrigger className="text-sm text-left">
                  What are the SharePoint link fields for?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  Each section of the Oversight Checklist includes two SharePoint URL fields (Link 1 and Link 2) at the bottom of the section. These are used to attach relevant SharePoint documents as evidence or reference material for that section. The links are editable during checklist completion and appear as clickable hyperlinks in read-only mode. They are also included in the printed checklist report.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q10">
                <AccordionTrigger className="text-sm text-left">
                  How are session attendees managed?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  In the Session Workspace, the POC Chair or Admin can add attendees using the "Add" button next to the Attendees label in the session header. Attendees are selected from the registered users list. They appear as badges and can be removed by clicking the X on their badge. When a review is submitted, the session attendees are automatically included in the review record and displayed in the Reviews tab on the Project Detail page.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q11">
                <AccordionTrigger className="text-sm text-left">
                  Is my data saved if I log out?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  Yes. All data (projects, reviews, actions, risks, sessions, attendees, checklists, and configuration) is persisted to the Supabase database. Changes are saved automatically when you make them and will be available when you log back in or refresh the page.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>

      {/* Footer note */}
      <p className="text-xs text-muted-foreground text-center pb-4">
        SSoc Governance Framework - Application Help Guide
      </p>
    </div>
  )
}
