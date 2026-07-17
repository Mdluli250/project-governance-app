"use client"

import { useMemo } from "react"
import type { Project, RAGStatus } from "@/lib/types"
import { RAG_DIMENSION_KEYS } from "@/lib/types"
import { DIMENSION_LABELS } from "@/lib/constants"
import { countRAGByDimension } from "@/lib/rules"
import { useData } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts"

const RAG_COLORS: Record<RAGStatus, string> = {
  RED: "hsl(0, 72%, 51%)",
  AMBER: "hsl(38, 92%, 50%)",
  GREEN: "hsl(142, 71%, 45%)",
}

interface RAGDistributionChartProps {
  projects: Project[]
  ragOverride?: { RED: number; AMBER: number; GREEN: number }
}

export function RAGDistributionChart({ projects, ragOverride }: RAGDistributionChartProps) {
  const { dashboardSummary } = useData()
  const ragCounts = useMemo(() => countRAGByDimension(projects), [projects])

  // Priority: explicit prop override > dashboardSummary from context > compute from projects
  const effectiveRagOverride = useMemo(() => {
    if (ragOverride) return ragOverride
    if (dashboardSummary) return dashboardSummary.ragDistribution.overall
    return undefined
  }, [ragOverride, dashboardSummary])

  const overallPieData = useMemo(
    () =>
      (["GREEN", "AMBER", "RED"] as RAGStatus[]).map((status) => ({
        name: status === "RED" ? "Red" : status === "AMBER" ? "Amber" : "Green",
        value: effectiveRagOverride ? effectiveRagOverride[status] : (ragCounts.overall?.[status] ?? 0),
        color: RAG_COLORS[status],
      })),
    [ragCounts, effectiveRagOverride]
  )

  const dimensionBarData = useMemo(
    () =>
      RAG_DIMENSION_KEYS.map((dim) => ({
        name: DIMENSION_LABELS[dim] ?? dim,
        Green: ragCounts[dim]?.GREEN ?? 0,
        Amber: ragCounts[dim]?.AMBER ?? 0,
        Red: ragCounts[dim]?.RED ?? 0,
      })),
    [ragCounts]
  )

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Overall RAG Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={overallPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {overallPieData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--card)",
                    color: "var(--card-foreground)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4">
            {overallPieData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                <span className="text-xs text-muted-foreground">
                  {d.name}: {d.value}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            RAG by Monitoring Dimension
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={dimensionBarData}
              layout="vertical"
              margin={{ left: 20, right: 10, top: 5, bottom: 5 }}
            >
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--card)",
                  color: "var(--card-foreground)",
                }}
              />
              <Bar dataKey="Green" stackId="a" fill={RAG_COLORS.GREEN} radius={[0, 0, 0, 0]} />
              <Bar dataKey="Amber" stackId="a" fill={RAG_COLORS.AMBER} />
              <Bar dataKey="Red" stackId="a" fill={RAG_COLORS.RED} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
