"use client"

import type { POCReview } from "@/lib/types"
import { COMMITTEE_TYPE_LABELS, REVIEW_OUTCOMES } from "@/lib/constants"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronDown, Calendar, Users, AlertTriangle, CheckCircle2 } from "lucide-react"
import { useState } from "react"

const outcomeStyles: Record<string, string> = {
  APPROVED: "bg-rag-green/15 text-rag-green border-rag-green/30",
  APPROVED_WITH_ACTIONS: "bg-rag-amber/15 text-rag-amber border-rag-amber/30",
  REJECTED: "bg-rag-red/15 text-rag-red border-rag-red/30",
  DEFERRED: "bg-muted text-muted-foreground border-border",
}

const outcomeLabels: Record<string, string> = Object.fromEntries(
  REVIEW_OUTCOMES.map((o) => [o.value, o.label])
)

interface ReviewsTabProps {
  reviews: POCReview[]
}

export function ReviewsTab({ reviews }: ReviewsTabProps) {
  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle2 className="size-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">No POC reviews recorded yet.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </div>
  )
}

function ReviewCard({ review }: { review: POCReview }) {
  const [open, setOpen] = useState(false)

  const checklistSummary = review.checklistResponses.reduce(
    (acc, item) => {
      if (item.response === "YES") acc.yes++
      else if (item.response === "NO") acc.no++
      else if (item.response === "PARTIAL") acc.partial++
      return acc
    },
    { yes: 0, no: 0, partial: 0 }
  )

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {new Date(review.reviewDate).toLocaleDateString("en-ZA", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {COMMITTEE_TYPE_LABELS[review.committeeType]}
                    </Badge>
                    {review.escalation && (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-rag-red/10 text-rag-red border-rag-red/30"
                      >
                        <AlertTriangle className="size-3 mr-1" />
                        Escalated
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={outcomeStyles[review.outcome]}
                >
                  {outcomeLabels[review.outcome]}
                </Badge>
                <ChevronDown
                  className={`size-4 text-muted-foreground transition-transform ${
                    open ? "rotate-180" : ""
                  }`}
                />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="border-t pt-4 flex flex-col gap-4">
            {/* Attendees */}
            <div>
              <h4 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
                <Users className="size-3" />
                Attendees
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {review.attendees.map((name) => (
                  <Badge key={name} variant="secondary" className="text-xs">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Checklist Summary */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">
                Checklist Summary
              </h4>
              <div className="flex gap-4">
                <span className="text-xs">
                  <span className="font-medium text-rag-green">{checklistSummary.yes}</span>{" "}
                  Yes
                </span>
                <span className="text-xs">
                  <span className="font-medium text-rag-amber">{checklistSummary.partial}</span>{" "}
                  Partial
                </span>
                <span className="text-xs">
                  <span className="font-medium text-rag-red">{checklistSummary.no}</span>{" "}
                  No
                </span>
              </div>
            </div>

            {/* Findings */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">
                Findings Summary
              </h4>
              <p className="text-sm">{review.findingsSummary}</p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
