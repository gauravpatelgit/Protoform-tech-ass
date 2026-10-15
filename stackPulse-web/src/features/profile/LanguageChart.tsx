import { Cell, Pie, PieChart } from "recharts"

import type { LanguageShare } from "@/api/types"
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
import { languageColor } from "@/lib/colors"
import { formatPercent } from "@/lib/format"

const MAX_SLICES = 6

function groupLanguages(languages: LanguageShare[]) {
  const sorted = [...languages].sort((a, b) => b.percent - a.percent)
  const top = sorted.slice(0, MAX_SLICES)
  const rest = sorted.slice(MAX_SLICES)
  const slices = top.map((item) => ({
    ...item,
    color: languageColor(item.language),
  }))
  if (rest.length) {
    slices.push({
      language: "Other",
      percent: rest.reduce((sum, item) => sum + item.percent, 0),
      color: "#9ca3af",
    })
  }
  return slices
}

export function LanguageChart({
  languages,
  loading,
}: {
  languages: LanguageShare[]
  loading: boolean
}) {
  const slices = groupLanguages(languages)
  const config = Object.fromEntries(
    slices.map((slice) => [
      slice.language,
      { label: slice.language, color: slice.color },
    ])
  ) satisfies ChartConfig

  return (
    <Card>
      <CardHeader>
        <CardTitle>Languages</CardTitle>
        <CardDescription>Share of code across top repositories</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && !slices.length ? (
          <Skeleton className="mx-auto size-44 rounded-full" />
        ) : !slices.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No language data available.
          </p>
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
            <ChartContainer
              config={config}
              className="aspect-square size-44 shrink-0"
            >
              <PieChart>
                <ChartTooltip
                  content={<ChartTooltipContent hideLabel nameKey="language" />}
                />
                <Pie
                  data={slices}
                  dataKey="percent"
                  nameKey="language"
                  innerRadius="60%"
                  strokeWidth={2}
                >
                  {slices.map((slice) => (
                    <Cell key={slice.language} fill={slice.color} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-1">
              {slices.map((slice) => (
                <li key={slice.language} className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="truncate">{slice.language}</span>
                  <span className="ml-auto text-muted-foreground tabular-nums">
                    {formatPercent(slice.percent)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
