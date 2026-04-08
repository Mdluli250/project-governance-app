"use client"

import { cn } from "@/lib/utils"
import type { Classification } from "@/lib/types"

const classColors: Record<Classification, string> = {
  A: "bg-primary/10 text-primary border-primary/30",
  B: "bg-accent/10 text-accent border-accent/30",
  C: "bg-muted text-muted-foreground border-border",
}

const classLabels: Record<Classification, string> = {
  A: "Class A",
  B: "Class B",
  C: "Class C",
}

interface ClassificationBadgeProps {
  classification: Classification
  className?: string
}

export function ClassificationBadge({
  classification,
  className,
}: ClassificationBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold",
        classColors[classification],
        className
      )}
    >
      {classLabels[classification]}
    </span>
  )
}
