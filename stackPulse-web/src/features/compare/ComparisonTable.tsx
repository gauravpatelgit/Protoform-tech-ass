import { CircleAlertIcon, TrophyIcon } from "lucide-react"
import { Link } from "react-router-dom"

import type { CompareEntry, CompareResult, NumericMetric } from "@/api/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DEVELOPER_COLORS } from "@/lib/colors"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

interface Row {
  label: string
  metric?: NumericMetric
  value: (entry: CompareEntry) => React.ReactNode
}

const ROWS: Row[] = [
  {
    label: "Followers",
    metric: "followers",
    value: (e) => formatNumber(e.profile?.followers ?? 0),
  },
  {
    label: "Total stars",
    metric: "totalStars",
    value: (e) => formatNumber(e.metrics?.totalStars ?? 0),
  },
  {
    label: "Repositories",
    metric: "repoCount",
    value: (e) => formatNumber(e.metrics?.repoCount ?? 0),
  },
  {
    label: "Avg stars / repo",
    metric: "avgStarsPerRepo",
    value: (e) => (e.metrics?.avgStarsPerRepo ?? 0).toFixed(1),
  },
  {
    label: "Commits (52 wks)",
    metric: "commits52w",
    value: (e) => formatNumber(e.metrics?.commits52w ?? 0),
  },
  {
    label: "Active repos (90 d)",
    metric: "activeRepos90d",
    value: (e) => formatNumber(e.metrics?.activeRepos90d ?? 0),
  },
  {
    label: "Languages used",
    metric: "languageCount",
    value: (e) => formatNumber(e.metrics?.languageCount ?? 0),
  },
  {
    label: "Top language",
    value: (e) => e.metrics?.languages[0]?.language ?? "-",
  },
  {
    label: "Most starred repo",
    value: (e) => e.metrics?.topRepos[0]?.name ?? "-",
  },
]

const STICKY = "sticky left-0 z-10 bg-background"

export function ComparisonTable({
  entries,
  leaders,
}: {
  entries: CompareEntry[]
  leaders: CompareResult["leaders"]
}) {
  const canRank = entries.filter((e) => e.status === "ok").length > 1

  const isLeader = (metric: NumericMetric | undefined, username: string) =>
    canRank &&
    !!metric &&
    !!leaders[metric]?.some((u) => u.toLowerCase() === username.toLowerCase())

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={cn(STICKY, "min-w-32")}>Metric</TableHead>
            {entries.map((entry, index) => (
              <TableHead key={entry.username} className="min-w-36 align-bottom">
                <div className="flex items-center gap-2 py-2">
                  <Avatar className="size-7">
                    <AvatarImage src={entry.profile?.avatarUrl} alt="" />
                    <AvatarFallback>
                      {entry.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Link
                    to={`/d/${entry.username}`}
                    className="flex items-center gap-1.5 truncate font-medium text-foreground hover:underline"
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          DEVELOPER_COLORS[index % DEVELOPER_COLORS.length],
                      }}
                    />
                    {entry.username}
                  </Link>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {ROWS.map((row) => (
            <TableRow key={row.label}>
              <TableCell className={cn(STICKY, "text-muted-foreground")}>
                {row.label}
              </TableCell>
              {entries.map((entry) => {
                if (entry.status === "error") {
                  return (
                    <TableCell
                      key={entry.username}
                      className="text-muted-foreground"
                    >
                      -
                    </TableCell>
                  )
                }
                const leader = isLeader(row.metric, entry.username)
                const pending =
                  row.metric === "commits52w" &&
                  (entry.enrichmentStatus === "pending" ||
                    entry.enrichmentStatus === "running") &&
                  (entry.metrics?.commits52w ?? 0) === 0
                return (
                  <TableCell
                    key={entry.username}
                    className={cn("tabular-nums", leader && "font-semibold")}
                  >
                    {pending ? (
                      <Skeleton className="h-4 w-12" />
                    ) : (
                      <span className="flex items-center gap-1.5">
                        {row.value(entry)}
                        {leader && (
                          <TrophyIcon
                            className="size-3.5 text-primary"
                            aria-label="Highest"
                          />
                        )}
                      </span>
                    )}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
          {entries.some((e) => e.status === "error") && (
            <TableRow>
              <TableCell className={STICKY}>Status</TableCell>
              {entries.map((entry) => (
                <TableCell key={entry.username}>
                  {entry.status === "error" && (
                    <span className="flex items-start gap-1.5 text-sm text-destructive">
                      <CircleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
                      {entry.error ?? "Could not load"}
                    </span>
                  )}
                </TableCell>
              ))}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
