"use client"

import { forwardRef } from "react"
import type { Project, POCReview, Action, RiskIssue, ChecklistItem } from "@/lib/types"
import { COMMITTEE_TYPE_LABELS, DIMENSION_LABELS, RAG_LABELS, REVIEW_OUTCOMES } from "@/lib/constants"

interface SessionPrintReportProps {
  sessionId: string
  sessionDate: string
  committeeType: string
  status: string
  attendees: string[]
  projects: Project[]
  getReviewsForProject: (id: string) => POCReview[]
  getActionsForProject: (id: string) => Action[]
  getRisksForProject: (id: string) => RiskIssue[]
}

const ragColor: Record<string, string> = {
  GREEN: "#16a34a",
  AMBER: "#f59e0b",
  RED: "#dc2626",
}

export const SessionPrintReport = forwardRef<HTMLDivElement, SessionPrintReportProps>(
  function SessionPrintReport(
    {
      sessionId,
      sessionDate,
      committeeType,
      status,
      attendees,
      projects,
      getReviewsForProject,
      getActionsForProject,
      getRisksForProject,
    },
    ref
  ) {
    const formattedDate = new Date(sessionDate).toLocaleDateString("en-ZA", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })

    return (
      <div ref={ref} className="session-print-report">
        <style>{`
          .session-print-report {
            font-family: 'Segoe UI', system-ui, sans-serif;
            color: #111;
            font-size: 11px;
            line-height: 1.5;
          }
          .session-print-report h1 {
            font-size: 18px;
            font-weight: 700;
            margin: 0 0 4px;
          }
          .session-print-report h2 {
            font-size: 14px;
            font-weight: 700;
            margin: 16px 0 6px;
            padding-bottom: 3px;
            border-bottom: 2px solid #222;
          }
          .session-print-report h3 {
            font-size: 12px;
            font-weight: 600;
            margin: 10px 0 4px;
          }
          .session-print-report .meta {
            color: #555;
            font-size: 11px;
            margin-bottom: 2px;
          }
          .session-print-report table {
            width: 100%;
            border-collapse: collapse;
            margin: 6px 0 12px;
            font-size: 10px;
          }
          .session-print-report th,
          .session-print-report td {
            border: 1px solid #ccc;
            padding: 4px 6px;
            text-align: left;
            vertical-align: top;
          }
          .session-print-report th {
            background: #f3f4f6;
            font-weight: 600;
          }
          .session-print-report .rag-dot {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 4px;
            vertical-align: middle;
          }
          .session-print-report .badge {
            display: inline-block;
            padding: 1px 6px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 600;
          }
          .session-print-report .page-break {
            page-break-before: always;
          }
          .session-print-report .section-divider {
            border-top: 1px solid #ddd;
            margin: 12px 0;
          }
          .session-print-report .project-header {
            background: #f8f9fa;
            padding: 8px 10px;
            border-radius: 6px;
            margin-bottom: 8px;
          }
          .session-print-report .no-data {
            color: #999;
            font-style: italic;
            font-size: 10px;
          }
        `}</style>

        {/* Cover / Header */}
        <h1>{COMMITTEE_TYPE_LABELS[committeeType] ?? committeeType} Session Report</h1>
        <p className="meta">Session ID: {sessionId}</p>
        <p className="meta">Date: {formattedDate}</p>
        <p className="meta">Status: {status}</p>
        <p className="meta">
          Attendees: {attendees.length > 0 ? attendees.join(", ") : "None recorded"}
        </p>
        <p className="meta">Projects on Agenda: {projects.length}</p>

        {/* Portfolio Summary Table */}
        <h2>Portfolio Summary</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Project</th>
              <th>Classification</th>
              <th>Overall RAG</th>
              <th>PM</th>
              <th>Open Risks</th>
              <th>Open Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p, i) => {
              const risks = getRisksForProject(p.id)
              const actions = getActionsForProject(p.id)
              return (
                <tr key={p.id}>
                  <td>{i + 1}</td>
                  <td>{p.shortTitle}</td>
                  <td>Class {p.classification}</td>
                  <td>
                    <span
                      className="rag-dot"
                      style={{ backgroundColor: ragColor[p.rag.overall] ?? "#999" }}
                    />
                    {RAG_LABELS[p.rag.overall] ?? p.rag.overall}
                  </td>
                  <td>{p.pmId ?? "Unassigned"}</td>
                  <td>{risks.filter((r) => r.status !== "CLOSED").length}</td>
                  <td>{actions.filter((a) => a.status !== "CLOSED").length}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Per-project details */}
        {projects.map((project, idx) => {
          const reviews = getReviewsForProject(project.id)
          const actions = getActionsForProject(project.id)
          const risks = getRisksForProject(project.id)
          const openRisks = risks.filter((r) => r.status !== "CLOSED")
          const openActions = actions.filter((a) => a.status !== "CLOSED")

          return (
            <div key={project.id} className={idx > 0 ? "page-break" : ""}>
              <h2>
                {idx + 1}. {project.shortTitle}
              </h2>
              <div className="project-header">
                <table style={{ margin: 0, border: "none" }}>
                  <tbody>
                    <tr>
                      <td style={{ border: "none", fontWeight: 600, width: "140px" }}>
                        Full Title
                      </td>
                      <td style={{ border: "none" }}>{project.longTitle}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "none", fontWeight: 600 }}>Classification</td>
                      <td style={{ border: "none" }}>Class {project.classification}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "none", fontWeight: 600 }}>Cluster / Impact Area</td>
                      <td style={{ border: "none" }}>
                        {project.cluster ?? "N/A"} / {project.impactArea ?? "N/A"}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: "none", fontWeight: 600 }}>Project Manager</td>
                      <td style={{ border: "none" }}>{project.pmId ?? "Unassigned"}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "none", fontWeight: 600 }}>Contract Value</td>
                      <td style={{ border: "none" }}>
                        R{(project.contractValue ?? 0).toLocaleString()}M
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: "none", fontWeight: 600 }}>Health Narrative</td>
                      <td style={{ border: "none" }}>
                        {project.healthNarrative || "No narrative provided"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* RAG Dimensions */}
              <h3>RAG Status</h3>
              <table>
                <thead>
                  <tr>
                    <th>Overall</th>
                    {Object.keys(DIMENSION_LABELS).map((dim) => (
                      <th key={dim}>{DIMENSION_LABELS[dim]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <span
                        className="rag-dot"
                        style={{
                          backgroundColor: ragColor[project.rag.overall] ?? "#999",
                        }}
                      />
                      {RAG_LABELS[project.rag.overall]}
                    </td>
                    {Object.keys(DIMENSION_LABELS).map((dim) => {
                      const val =
                        project.rag[dim as keyof typeof project.rag] ?? "GREEN"
                      return (
                        <td key={dim}>
                          <span
                            className="rag-dot"
                            style={{ backgroundColor: ragColor[val] ?? "#999" }}
                          />
                          {RAG_LABELS[val] ?? val}
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>

              {/* Open Risks */}
              <h3>Open Risks ({openRisks.length})</h3>
              {openRisks.length === 0 ? (
                <p className="no-data">No open risks</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>RAG</th>
                      <th>Owner</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openRisks.map((r) => (
                      <tr key={r.id}>
                        <td>{r.title}</td>
                        <td>{r.ragStatus}</td>
                        <td>{r.owner}</td>
                        <td>{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Open Actions */}
              <h3>Open Actions ({openActions.length})</h3>
              {openActions.length === 0 ? (
                <p className="no-data">No open actions</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Owner</th>
                      <th>Due Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openActions.map((a) => (
                      <tr key={a.id}>
                        <td>{a.description}</td>
                        <td>{a.category}</td>
                        <td>{a.owner}</td>
                        <td>{a.dueDate}</td>
                        <td>{a.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Reviews */}
              <h3>Reviews ({reviews.length})</h3>
              {reviews.length === 0 ? (
                <p className="no-data">No reviews recorded</p>
              ) : (
                reviews.map((rev) => (
                  <div key={rev.id} style={{ marginBottom: 8 }}>
                    <table>
                      <tbody>
                        <tr>
                          <td style={{ fontWeight: 600, width: 120 }}>Date</td>
                          <td>{rev.reviewDate}</td>
                          <td style={{ fontWeight: 600, width: 120 }}>Outcome</td>
                          <td>
                            {REVIEW_OUTCOMES.find(
                              (o) => o.value === rev.outcome
                            )?.label ?? rev.outcome}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 600 }}>Attendees</td>
                          <td colSpan={3}>{rev.attendees.join(", ")}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 600 }}>Findings</td>
                          <td colSpan={3}>{rev.findingsSummary || "N/A"}</td>
                        </tr>
                        {rev.escalation && (
                          <tr>
                            <td style={{ fontWeight: 600 }}>Escalation</td>
                            <td colSpan={3} style={{ color: "#dc2626" }}>
                              Flagged for escalation
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </div>
          )
        })}

        {/* Footer */}
        <div className="section-divider" />
        <p className="meta" style={{ textAlign: "center" }}>
          Generated on{" "}
          {new Date().toLocaleDateString("en-ZA", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          -- SSoc Governance Framework
        </p>
      </div>
    )
  }
)
