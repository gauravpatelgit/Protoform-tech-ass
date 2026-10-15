import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"

import type { DeveloperMetrics } from "@/api/types"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { languageColor } from "@/lib/colors"
import { formatCompact, formatShortDate } from "@/lib/format"

export interface ChartEntry {
  username: string
  color: string
  followers: number
  metrics: DeveloperMetrics
}

const MAX_LANGUAGES = 6

function developerConfig(entries: ChartEntry[]): ChartConfig {
  return Object.fromEntries(
    entries.map((entry) => [
      entry.username,
      { label: entry.username, color: entry.color },
    ])
  )
}

function MetricBarChart({
  title,
  entries,
  value,
}: {
  title: string
  entries: ChartEntry[]
  value: (entry: ChartEntry) => number
}) {
  const data = entries.map((entry) => ({
    username: entry.username,
    value: value(entry),
    fill: entry.color,
  }))

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={developerConfig(entries)}
          className="aspect-auto h-40 w-full"
        >
          <BarChart data={data} margin={{ top: 20 }}>
            <XAxis
              dataKey="username"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(name: string) =>
                name.length > 8 ? `${name.slice(0, 7)}…` : name
              }
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel nameKey="username" />}
            />
            <Bar dataKey="value" radius={4}>
              {data.map((item) => (
                <Cell key={item.username} fill={item.fill} />
              ))}
              <LabelList
                dataKey="value"
                position="top"
                className="fill-foreground"
                formatter={(label: unknown) => formatCompact(Number(label))}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function LanguageStackChart({ entries }: { entries: ChartEntry[] }) {
  const totals = new Map<string, number>()
  for (const entry of entries) {
    for (const item of entry.metrics.languages) {
      totals.set(item.language, (totals.get(item.language) ?? 0) + item.percent)
    }
  }
  const languages = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_LANGUAGES)
    .map(([language]) => language)

  const data = entries.map((entry) => {
    const row: Record<string, string | number> = { username: entry.username }
    for (const language of languages) {
      row[language] =
        entry.metrics.languages.find((item) => item.language === language)
          ?.percent ?? 0
    }
    return row
  })

  const config: ChartConfig = Object.fromEntries(
    languages.map((language) => [
      language,
      { label: language, color: languageColor(language) },
    ])
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Languages</CardTitle>
        <CardDescription>Share of code, top languages overall</CardDescription>
      </CardHeader>
      <CardContent>
        {languages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No language data available yet.
          </p>
        ) : (
          <ChartContainer
            config={config}
            className="aspect-auto w-full"
            style={{ height: 64 + entries.length * 44 }}
          >
            <BarChart data={data} layout="vertical" margin={{ left: 0 }}>
              <CartesianGrid horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                tickFormatter={(tick: number) => `${tick}%`}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="username"
                width={84}
                tickLine={false}
                axisLine={false}
                tickFormatter={(name: string) =>
                  name.length > 11 ? `${name.slice(0, 10)}…` : name
                }
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              {languages.map((language) => (
                <Bar
                  key={language}
                  dataKey={language}
                  stackId="languages"
                  fill={languageColor(language)}
                />
              ))}
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

function CommitTrendChart({ entries }: { entries: ChartEntry[] }) {
  const weeks = entries[0]?.metrics.weeklyCommits ?? []
  const hasData = entries.some((entry) =>
    entry.metrics.weeklyCommits.some((week) => week.commits > 0)
  )

  const data = weeks.map((week, index) => {
    const row: Record<string, string | number> = { weekStart: week.weekStart }
    for (const entry of entries) {
      row[entry.username] = entry.metrics.weeklyCommits[index]?.commits ?? 0
    }
    return row
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commit activity</CardTitle>
        <CardDescription>Weekly commits over the last 52 weeks</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No commit activity available yet.
          </p>
        ) : (
          <ChartContainer
            config={developerConfig(entries)}
            className="aspect-auto h-56 w-full"
          >
            <LineChart data={data}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="weekStart"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={48}
                tickFormatter={formatShortDate}
              />
              <YAxis
                width={32}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatCompact}
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
              <ChartLegend content={<ChartLegendContent />} />
              {entries.map((entry) => (
                <Line
                  key={entry.username}
                  dataKey={entry.username}
                  type="monotone"
                  stroke={entry.color}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

export function ComparisonCharts({ entries }: { entries: ChartEntry[] }) {
  if (entries.length === 0) return null

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricBarChart
          title="Total stars"
          entries={entries}
          value={(entry) => entry.metrics.totalStars}
        />
        <MetricBarChart
          title="Followers"
          entries={entries}
          value={(entry) => entry.followers}
        />
        <MetricBarChart
          title="Commits (52 wks)"
          entries={entries}
          value={(entry) => entry.metrics.commits52w}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <LanguageStackChart entries={entries} />
        <CommitTrendChart entries={entries} />
      </div>
    </div>
  )
}
