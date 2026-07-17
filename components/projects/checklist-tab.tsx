"use client"

import { useState, useCallback, useRef } from "react"
import type { ChecklistItem, ChecklistResponse } from "@/lib/types"
import { useAuth, useData } from "@/lib/store"
import { canPerformAction } from "@/lib/rules"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ClipboardCheck, ChevronDown, Printer, ExternalLink } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface ChecklistTabProps {
  checklist: ChecklistItem[]
  projectTitle?: string
  readOnly?: boolean
  onUpdate?: (items: ChecklistItem[]) => void
}

export function ChecklistTab({ checklist, projectTitle, readOnly = false, onUpdate }: ChecklistTabProps) {
  const { currentUser } = useAuth()
  const { checklistTemplate } = useData()
  const canEdit = !readOnly && canPerformAction(currentUser, "COMPLETE_CHECKLIST")
  const printRef = useRef<HTMLDivElement>(null)

  const sections = checklistTemplate.map((tmpl) => ({
    section: tmpl.section,
    items: checklist.filter((item) => item.section === tmpl.section),
  }))

  const updateItem = (itemId: string, updates: Partial<ChecklistItem>) => {
    if (!onUpdate) return
    const updated = checklist.map((item) =>
      item.id === itemId ? { ...item, ...updates } : item
    )
    onUpdate(updated)
  }

  const summary = checklist.reduce(
    (acc, item) => {
      if (item.response === "YES") acc.yes++
      else if (item.response === "NO") acc.no++
      else if (item.response === "PARTIAL") acc.partial++
      else acc.unanswered++
      return acc
    },
    { yes: 0, no: 0, partial: 0, unanswered: 0 }
  )

  const handlePrint = useCallback(() => {
    const el = printRef.current
    if (!el) return
    const win = window.open("", "_blank", "width=900,height=700")
    if (!win) return
    win.document.write(`<!DOCTYPE html>
<html><head>
<title>Oversight Checklist${projectTitle ? ` - ${projectTitle}` : ""}</title>
<style>
@page { size: A4; margin: 15mm 12mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1a1a1a; font-size: 11px; line-height: 1.5; padding: 4px; }
h1 { font-size: 16px; margin-bottom: 2px; }
h2 { font-size: 13px; margin: 14px 0 6px; padding-bottom: 3px; border-bottom: 2px solid #0a0a0a; }
.subtitle { font-size: 11px; color: #666; margin-bottom: 10px; }
.summary-bar { display: flex; gap: 16px; padding: 6px 10px; background: #f5f5f5; border-radius: 4px; margin-bottom: 14px; font-size: 11px; }
.summary-bar .green { color: #16a34a; font-weight: 700; }
.summary-bar .amber { color: #d97706; font-weight: 700; }
.summary-bar .red { color: #dc2626; font-weight: 700; }
.summary-bar .grey { color: #888; font-weight: 700; }
table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
th, td { border: 1px solid #d4d4d4; padding: 4px 6px; text-align: left; vertical-align: top; font-size: 10px; }
th { background: #f5f5f5; font-weight: 600; font-size: 10px; }
.response-yes { color: #16a34a; font-weight: 600; }
.response-no { color: #dc2626; font-weight: 600; }
.response-partial { color: #d97706; font-weight: 600; }
.response-pending { color: #888; }
.links { font-size: 9px; color: #2563eb; margin-top: 2px; }
.links a { color: #2563eb; text-decoration: underline; word-break: break-all; }
.action-flag { background: #fef2f2; color: #dc2626; font-size: 9px; padding: 1px 4px; border-radius: 2px; font-weight: 600; }
</style>
</head><body>${el.innerHTML}</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 400)
  }, [projectTitle])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 rounded-lg border p-3 bg-muted/30">
        <ClipboardCheck className="size-4 text-muted-foreground" />
        <div className="flex gap-4 text-xs">
          <span><span className="font-semibold text-rag-green">{summary.yes}</span> Yes</span>
          <span><span className="font-semibold text-rag-amber">{summary.partial}</span> Partial</span>
          <span><span className="font-semibold text-rag-red">{summary.no}</span> No</span>
          <span><span className="font-semibold text-muted-foreground">{summary.unanswered}</span> Pending</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {canEdit && (
            <Badge variant="secondary" className="text-[10px] bg-rag-green/10 text-rag-green border-rag-green/30">Editing</Badge>
          )}
          {!canEdit && !readOnly && (
            <Badge variant="secondary" className="text-[10px]">Read Only</Badge>
          )}
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={handlePrint}>
            <Printer className="size-3.5" />
            Print / PDF
          </Button>
        </div>
      </div>

      {sections.map((section) => (
        <ChecklistSection
          key={section.section}
          section={section.section}
          items={section.items}
          canEdit={canEdit}
          onUpdateItem={updateItem}
        />
      ))}

      {/* Hidden print-ready content */}
      <div className="hidden">
        <div ref={printRef}>
          <h1>Oversight Checklist</h1>
          {projectTitle && <p className="subtitle">{projectTitle}</p>}
          <p className="subtitle">Generated {new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}</p>
          <div className="summary-bar">
            <span><span className="green">{summary.yes}</span> Yes</span>
            <span><span className="amber">{summary.partial}</span> Partial</span>
            <span><span className="red">{summary.no}</span> No</span>
            <span><span className="grey">{summary.unanswered}</span> Pending</span>
          </div>
          {sections.map((section) => {
              const sLinks = section.items[0]?.evidenceLinks ?? []
              return (
                <div key={section.section}>
                  <h2>{section.section}</h2>
                  {(sLinks[0] || sLinks[1]) && (
                    <div className="links" style={{ marginBottom: 4 }}>
                      {sLinks[0] && <span>Link 1: <a href={sLinks[0]}>{sLinks[0]}</a>&nbsp;&nbsp;</span>}
                      {sLinks[1] && <span>Link 2: <a href={sLinks[1]}>{sLinks[1]}</a></span>}
                    </div>
                  )}
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: "45%" }}>Item</th>
                        <th style={{ width: "12%" }}>Response</th>
                        <th style={{ width: "35%" }}>Comment</th>
                        <th style={{ width: "8%" }}>Action?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.item}</td>
                          <td className={
                            item.response === "YES" ? "response-yes"
                              : item.response === "NO" ? "response-no"
                              : item.response === "PARTIAL" ? "response-partial"
                              : "response-pending"
                          }>
                            {item.response ?? "Pending"}
                          </td>
                          <td>{item.comment || "-"}</td>
                          <td>{item.actionRequired ? <span className="action-flag">YES</span> : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
          })}
        </div>
      </div>
    </div>
  )
}

function ChecklistSection({
  section,
  items,
  canEdit,
  onUpdateItem,
}: {
  section: string
  items: ChecklistItem[]
  canEdit: boolean
  onUpdateItem: (id: string, updates: Partial<ChecklistItem>) => void
}) {
  const [open, setOpen] = useState(true)
  const sectionComplete = items.every((i) => i.response !== null)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">{section}</CardTitle>
              <div className="flex items-center gap-2">
                {sectionComplete && (
                  <Badge variant="secondary" className="text-[10px]">Complete</Badge>
                )}
                <ChevronDown className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="flex flex-col gap-4 pt-0">
            {items.map((item) => (
                <div key={item.id} className="flex flex-col gap-2 border-b pb-4 last:border-0 last:pb-0">
                  <p className="text-sm">{item.item}</p>
                  <RadioGroup
                    value={item.response ?? undefined}
                    onValueChange={(v) => canEdit && onUpdateItem(item.id, { response: v as ChecklistResponse })}
                    disabled={!canEdit}
                    className="flex gap-4"
                  >
                    {(["YES", "NO", "PARTIAL"] as const).map((val) => (
                      <div key={val} className="flex items-center gap-1.5">
                        <RadioGroupItem value={val} id={`${item.id}-${val}`} />
                        <Label htmlFor={`${item.id}-${val}`} className="text-xs cursor-pointer">
                          {val === "YES" ? "Yes" : val === "NO" ? "No" : "Partial"}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  <Textarea
                    value={item.comment}
                    onChange={(e) => canEdit && onUpdateItem(item.id, { comment: e.target.value })}
                    disabled={!canEdit}
                    placeholder="Comment (required when answered)..."
                    className="text-xs min-h-[48px] resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={item.actionRequired}
                      onCheckedChange={(checked) => canEdit && onUpdateItem(item.id, { actionRequired: checked })}
                      disabled={!canEdit}
                    />
                    <Label className="text-xs text-muted-foreground">Action required</Label>
                  </div>
                </div>
            ))}

            {/* Section-level SharePoint links at bottom */}
            <SectionLinks items={items} canEdit={canEdit} onUpdateItem={onUpdateItem} />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

/** Two SharePoint URL fields rendered at the bottom of each section.
 *  Links are stored in the evidenceLinks array of the section's first item. */
function SectionLinks({
  items,
  canEdit,
  onUpdateItem,
}: {
  items: ChecklistItem[]
  canEdit: boolean
  onUpdateItem: (id: string, updates: Partial<ChecklistItem>) => void
}) {
  if (items.length === 0) return null

  const firstItem = items[0]
  const links = firstItem.evidenceLinks ?? ["", ""]
  const link1 = links[0] ?? ""
  const link2 = links[1] ?? ""

  const updateLink = (idx: 0 | 1, val: string) => {
    const next = [link1, link2]
    next[idx] = val
    onUpdateItem(firstItem.id, { evidenceLinks: next })
  }

  return (
    <div className="mt-2 pt-3 border-t border-dashed border-muted-foreground/30">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
        <ExternalLink className="size-3" />
        Section SharePoint Links
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-0.5">
          <Label className="text-[10px] font-medium text-muted-foreground">Link 1</Label>
          {canEdit ? (
            <Input
              type="url"
              value={link1}
              onChange={(e) => updateLink(0, e.target.value)}
              placeholder="https://..."
              className="h-7 text-xs"
            />
          ) : link1 ? (
            <a href={link1} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline truncate">
              {link1}
            </a>
          ) : (
            <span className="text-[10px] text-muted-foreground/60 italic">Not set</span>
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          <Label className="text-[10px] font-medium text-muted-foreground">Link 2</Label>
          {canEdit ? (
            <Input
              type="url"
              value={link2}
              onChange={(e) => updateLink(1, e.target.value)}
              placeholder="https://..."
              className="h-7 text-xs"
            />
          ) : link2 ? (
            <a href={link2} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline truncate">
              {link2}
            </a>
          ) : (
            <span className="text-[10px] text-muted-foreground/60 italic">Not set</span>
          )}
        </div>
      </div>
    </div>
  )
}
