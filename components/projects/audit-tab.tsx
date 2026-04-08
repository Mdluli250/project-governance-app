"use client"

import type { AuditEntry, AuditType } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { RAGBadge } from "@/components/rag-badge"
import type { RAGStatus } from "@/lib/types"
import {
  FileText,
  Activity,
  Shield,
  Milestone,
  ClipboardCheck,
  RefreshCw,
  FileEdit,
  History,
  AlertTriangle,
} from "lucide-react"

const typeConfig: Record<AuditType, { label: string; icon: typeof Activity; className: string }> = {
  CLASSIFICATION_CHANGE: {
    label: "Classification",
    icon: FileText,
    className: "text-primary",
  },
  RAG_CHANGE: {
    label: "RAG Change",
    icon: Activity,
    className: "text-rag-amber",
  },
  POC_DECISION: {
    label: "POC Decision",
    icon: Shield,
    className: "text-accent",
  },
  KDA_DECISION: {
    label: "KDA Decision",
    icon: Milestone,
    className: "text-primary",
  },
  ACTION_CHANGE: {
    label: "Action",
    icon: ClipboardCheck,
    className: "text-rag-green",
  },
  HEALTH_UPDATE: {
    label: "Health Update",
    icon: RefreshCw,
    className: "text-muted-foreground",
  },
  PROJECT_UPDATE: {
    label: "Project Update",
    icon: FileEdit,
    className: "text-muted-foreground",
  },
  REVIEW_CREATED: {
    label: "Review Created",
    icon: Shield,
    className: "text-accent",
  },
  RISK: {
    label: "Risk / Issue",
    icon: AlertTriangle,
    className: "text-rag-amber",
  },
}

const fallbackConfig = {
  label: "Event",
  icon: History,
  className: "text-muted-foreground",
}

interface AuditTabProps {
  entries: AuditEntry[]
}

export function AuditTab({ entries }: AuditTabProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <History className="size-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">No audit trail entries.</p>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col gap-0 pl-6">
      <div className="absolute left-[11px] top-1 bottom-1 w-px bg-border" aria-hidden="true" />

      {entries.map((entry) => {
        const config = typeConfig[entry.type] ?? fallbackConfig
        const Icon = config.icon
        const ts = new Date(entry.timestamp)

        return (
          <div key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Timeline dot */}
            <div className="absolute -left-[13px] top-1 flex size-6 items-center justify-center rounded-full bg-background border border-border">
              <Icon className={`size-3 ${config.className}`} />
            </div>

            {/* Content */}
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-[10px]">
                  {config.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {ts.toLocaleDateString("en-ZA", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  {ts.toLocaleTimeString("en-ZA", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-sm">{entry.description}</p>
              <span className="text-xs text-muted-foreground">
                by {entry.actor}
              </span>
              {entry.type === "RAG_CHANGE" && entry.oldValue && entry.newValue && (
                <div className="flex items-center gap-2 mt-1">
                  <RAGBadge status={entry.oldValue as RAGStatus} />
                  <span className="text-xs text-muted-foreground">{"-->"}</span>
                  <RAGBadge status={entry.newValue as RAGStatus} />
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
