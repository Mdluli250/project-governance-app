"use client"

import type { KDADecision, GateDecision } from "@/lib/types"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Milestone, CheckCircle2, XCircle, AlertTriangle } from "lucide-react"

const decisionStyles: Record<GateDecision, { className: string; icon: typeof CheckCircle2 }> = {
  APPROVED: {
    className: "bg-rag-green/10 text-rag-green border-rag-green/30",
    icon: CheckCircle2,
  },
  REJECTED: {
    className: "bg-rag-red/10 text-rag-red border-rag-red/30",
    icon: XCircle,
  },
  EXCEPTION_REQUIRED: {
    className: "bg-rag-amber/10 text-rag-amber border-rag-amber/30",
    icon: AlertTriangle,
  },
}

const decisionLabels: Record<GateDecision, string> = {
  APPROVED: "Approved",
  REJECTED: "Rejected",
  EXCEPTION_REQUIRED: "Exception Required",
}

interface KDATabProps {
  decisions: KDADecision[]
}

export function KDATab({ decisions }: KDATabProps) {
  if (decisions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Milestone className="size-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">No KDA gate decisions recorded.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Timeline view */}
      <div className="relative flex flex-col gap-4 pl-6">
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" aria-hidden="true" />
        {decisions.map((decision) => {
          const style = decisionStyles[decision.decision]
          const Icon = style.icon
          return (
            <Card key={decision.id} className="relative">
              <div className="absolute -left-[13px] top-5 flex size-6 items-center justify-center rounded-full bg-background border-2 border-border">
                <Icon className={`size-3.5 ${decision.decision === "APPROVED" ? "text-rag-green" : decision.decision === "REJECTED" ? "text-rag-red" : "text-rag-amber"}`} />
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    {decision.gateName}
                  </CardTitle>
                  <Badge variant="outline" className={style.className}>
                    {decisionLabels[decision.decision]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{decision.stage}</span>
                  <span>
                    {new Date(decision.date).toLocaleDateString("en-ZA", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <p className="text-sm">{decision.notes}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Signed off by:</span>
                  <Badge variant="secondary" className="text-xs">
                    {decision.signedOffBy}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Summary table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Gate Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gate</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead className="hidden md:table-cell">Signed Off By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {decisions.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium text-sm">{d.gateName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.stage}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(d.date).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={decisionStyles[d.decision].className}>
                      {decisionLabels[d.decision]}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {d.signedOffBy}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
