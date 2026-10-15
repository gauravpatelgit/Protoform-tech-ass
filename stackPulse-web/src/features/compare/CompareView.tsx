import type { CompareResult } from "@/api/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { isEnriching } from "@/api/compare"
import {
  ComparisonCharts,
  type ChartEntry,
} from "@/features/compare/ComparisonCharts"
import { ComparisonTable } from "@/features/compare/ComparisonTable"
import { DEVELOPER_COLORS } from "@/lib/colors"

// Shared by the live compare page and saved comparisons.
export function CompareView({
  result,
  usernames,
}: {
  result: CompareResult
  usernames: string[]
}) {
  // Keep columns and colours in the order the user picked, whatever order the API returns.
  const byName = new Map(
    result.developers.map((entry) => [entry.username.toLowerCase(), entry])
  )
  const entries = usernames.flatMap((username) => {
    const entry = byName.get(username.toLowerCase())
    return entry ? [entry] : []
  })

  const chartEntries: ChartEntry[] = entries.flatMap((entry, index) =>
    entry.status === "ok" && entry.metrics && entry.profile
      ? [
          {
            username: entry.username,
            color: DEVELOPER_COLORS[index % DEVELOPER_COLORS.length]!,
            followers: entry.profile.followers,
            metrics: entry.metrics,
          },
        ]
      : []
  )

  return (
    <div className="flex flex-col gap-6">
      {isEnriching(result) && (
        <Alert>
          <Spinner />
          <AlertTitle>Analysing repositories</AlertTitle>
          <AlertDescription>
            Languages and commit activity are still being collected and will
            appear automatically.
          </AlertDescription>
        </Alert>
      )}
      <ComparisonTable entries={entries} leaders={result.leaders} />
      <ComparisonCharts entries={chartEntries} />
    </div>
  )
}
