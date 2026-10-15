import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import type { WeeklyCommits } from "@/api/types"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { DEVELOPER_COLORS } from "@/lib/colors"
import { formatNumber, formatShortDate } from "@/lib/format"

const config = {
  commits: { label: "Commits", color: DEVELOPER_COLORS[0]! },
} satisfies ChartConfig

export function CommitChart({
  weeks,
  total,
  loading,
}: {
  weeks: WeeklyCommits[]
  total: number
  loading: boolean
}) {
  const hasData = weeks.some((week) => week.commits > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commit activity</CardTitle>
        <CardDescription>
          {hasData
            ? `${formatNumber(total)} commits in the last 52 weeks`
            : "Weekly commits over the last 52 weeks"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && !hasData ? (
          <Skeleton className="h-44 w-full" />
        ) : !hasData ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No recent commit activity.
          </p>
        ) : (
          <ChartContainer config={config} className="aspect-auto h-44 w-full">
            <BarChart data={weeks} margin={{ left: 0, right: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="weekStart"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={48}
                tickFormatter={formatShortDate}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(label) =>
                      `Week of ${formatShortDate(String(label))}`
                    }
                  />
                }
              />
              <Bar dataKey="commits" fill="var(--color-commits)" radius={2} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
