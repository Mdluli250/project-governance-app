"use client"

import type { Classification } from "@/lib/types"
import { useAuth, useData } from "@/lib/store"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { X } from "lucide-react"

export interface FilterState {
  classes: Classification[]
  cluster: string | null
  pm: string | null
  objective: string | null
}

interface PortfolioFiltersProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
}

export function PortfolioFilters({
  filters,
  onFiltersChange,
}: PortfolioFiltersProps) {
  const toggleClass = (cls: Classification) => {
    const current = filters.classes
    const next = current.includes(cls)
      ? current.filter((c) => c !== cls)
      : [...current, cls]
    onFiltersChange({ ...filters, classes: next })
  }

  const { users } = useAuth()
  const { clusters, strategicObjectives } = useData()

  const hasAnyFilter =
    filters.classes.length > 0 ||
    filters.cluster !== null ||
    filters.pm !== null ||
    filters.objective !== null

  const clearAll = () =>
    onFiltersChange({ classes: [], cluster: null, pm: null, objective: null })

  const pms = users.filter((u) => u.role === "PM")

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Class filter */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Class:</span>
        {(["A", "B", "C"] as Classification[]).map((cls) => (
          <Badge
            key={cls}
            variant={filters.classes.includes(cls) ? "default" : "outline"}
            className="cursor-pointer select-none"
            onClick={() => toggleClass(cls)}
          >
            {cls}
          </Badge>
        ))}
      </div>

      {/* Cluster filter */}
      <Select
        value={filters.cluster ?? "ALL"}
        onValueChange={(v) =>
          onFiltersChange({ ...filters, cluster: v === "ALL" ? null : v })
        }
      >
        <SelectTrigger className="h-8 w-[160px] text-xs">
          <SelectValue placeholder="Cluster" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Clusters</SelectItem>
          {clusters.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Strategic Objective */}
      <Select
        value={filters.objective ?? "ALL"}
        onValueChange={(v) =>
          onFiltersChange({ ...filters, objective: v === "ALL" ? null : v })
        }
      >
        <SelectTrigger className="h-8 w-[180px] text-xs">
          <SelectValue placeholder="Strategic Objective" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Objectives</SelectItem>
          {strategicObjectives.map((so) => (
            <SelectItem key={so.id} value={so.id}>
              {so.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear */}
      {hasAnyFilter && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="h-8 text-xs text-muted-foreground"
        >
          <X className="mr-1 size-3" />
          Clear
        </Button>
      )}
    </div>
  )
}
