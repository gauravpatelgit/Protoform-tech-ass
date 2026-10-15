import {
  BookMarkedIcon,
  GitCommitHorizontalIcon,
  StarIcon,
  UsersIcon,
} from "lucide-react"

import type { Developer } from "@/api/types"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCompact, formatNumber } from "@/lib/format"

function Metric({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string
  value: number
  icon: typeof StarIcon
  loading?: boolean
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5">
          <Icon className="size-3.5" />
          {label}
        </CardDescription>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <CardTitle
            className="text-2xl tabular-nums"
            title={formatNumber(value)}
          >
            {formatCompact(value)}
          </CardTitle>
        )}
      </CardHeader>
    </Card>
  )
}

export function MetricCards({
  developer,
  enriching,
}: {
  developer: Developer
  enriching: boolean
}) {
  const { metrics, profile } = developer

  return (
    <section
      aria-label="Key metrics"
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
      <Metric label="Total stars" value={metrics.totalStars} icon={StarIcon} />
      <Metric label="Followers" value={profile.followers} icon={UsersIcon} />
      <Metric
        label="Repositories"
        value={metrics.repoCount}
        icon={BookMarkedIcon}
      />
      <Metric
        label="Commits (52 wks)"
        value={metrics.commits52w}
        icon={GitCommitHorizontalIcon}
        loading={enriching && metrics.commits52w === 0}
      />
    </section>
  )
}
