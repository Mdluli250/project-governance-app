"use client"

import { cn } from "@/lib/utils"
import type { RAGStatus } from "@/lib/types"

const ragColors: Record<RAGStatus, { dot: string; badge: string; text: string }> = {
  RED: {
    dot: "bg-rag-red",
    badge: "bg-rag-red/15 text-rag-red border-rag-red/30",
    text: "text-rag-red",
  },
  AMBER: {
    dot: "bg-rag-amber",
    badge: "bg-rag-amber/15 text-rag-amber border-rag-amber/30",
    text: "text-rag-amber",
  },
  GREEN: {
    dot: "bg-rag-green",
    badge: "bg-rag-green/15 text-rag-green border-rag-green/30",
    text: "text-rag-green",
  },
}

const ragLabels: Record<RAGStatus, string> = {
  RED: "Red",
  AMBER: "Amber",
  GREEN: "Green",
}

interface RAGBadgeProps {
  status: RAGStatus
  variant?: "dot" | "badge" | "large"
  showLabel?: boolean
  className?: string
}

export function RAGBadge({
  status,
  variant = "badge",
  showLabel = true,
  className,
}: RAGBadgeProps) {
  const colors = ragColors[status]

  if (variant === "dot") {
    return (
      <span className={cn("flex items-center gap-1.5", className)}>
        <span
          className={cn("inline-block h-2.5 w-2.5 rounded-full", colors.dot)}
          aria-hidden="true"
        />
        {showLabel && (
          <span className={cn("text-xs font-medium", colors.text)}>
            {ragLabels[status]}
          </span>
        )}
      </span>
    )
  }

  if (variant === "large") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold",
          colors.badge,
          className
        )}
      >
        <span
          className={cn("inline-block h-3 w-3 rounded-full", colors.dot)}
          aria-hidden="true"
        />
        {ragLabels[status]}
      </span>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        colors.badge,
        className
      )}
    >
      <span
        className={cn("inline-block h-2 w-2 rounded-full", colors.dot)}
        aria-hidden="true"
      />
      {showLabel && ragLabels[status]}
    </span>
  )
}
