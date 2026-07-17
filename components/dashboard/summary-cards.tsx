"use client"

import { useMemo } from "react"
import type { Project, Classification } from "@/lib/types"
import { useData } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FolderKanban, ShieldAlert, ShieldCheck, Shield } from "lucide-react"

interface SummaryCardsProps {
  projects: Project[]
  summaryOverride?: {
    total: number
    classA: number
    classB: number
    classC: number
  }
}

export function SummaryCards({ projects, summaryOverride }: SummaryCardsProps) {
  const { dashboardSummary } = useData()

  const counts = useMemo(() => {
    // Priority: explicit prop override > dashboardSummary from context > compute from projects
    if (summaryOverride) return summaryOverride
    if (dashboardSummary) {
      return {
        total: dashboardSummary.totalProjects,
        classA: dashboardSummary.classificationCounts.A,
        classB: dashboardSummary.classificationCounts.B,
        classC: dashboardSummary.classificationCounts.C,
      }
    }
    const total = projects.length
    const classA = projects.filter((p) => p.classification === "A").length
    const classB = projects.filter((p) => p.classification === "B").length
    const classC = projects.filter((p) => p.classification === "C").length
    return { total, classA, classB, classC }
  }, [projects, summaryOverride, dashboardSummary])

  const cards = [
    {
      title: "Total Projects",
      value: counts.total,
      icon: FolderKanban,
      description: "Active portfolio",
      accent: "text-primary",
    },
    {
      title: "Class A",
      value: counts.classA,
      icon: ShieldAlert,
      description: "Divisional Oversight",
      accent: "text-primary",
    },
    {
      title: "Class B",
      value: counts.classB,
      icon: Shield,
      description: "Cluster Oversight",
      accent: "text-accent",
    },
    {
      title: "Class C",
      value: counts.classC,
      icon: ShieldCheck,
      description: "Impact Area Oversight",
      accent: "text-muted-foreground",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className={`size-4 ${card.accent}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
