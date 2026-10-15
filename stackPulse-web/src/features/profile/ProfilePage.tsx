import { SearchXIcon, TriangleAlertIcon } from "lucide-react"
import { useParams } from "react-router-dom"

import { ApiError } from "@/api/client"
import { useDeveloper } from "@/api/developers"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { CommitChart } from "@/features/profile/CommitChart"
import { EnrichmentNotice } from "@/features/profile/EnrichmentNotice"
import { LanguageChart } from "@/features/profile/LanguageChart"
import { MetricCards } from "@/features/profile/MetricCards"
import { ProfileHeader } from "@/features/profile/ProfileHeader"
import { RepoList } from "@/features/profile/RepoList"
import { SearchBar } from "@/features/search/SearchBar"

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-4">
        <Skeleton className="size-20 shrink-0 rounded-full sm:size-24" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-20" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  )
}

function ProfileError({
  error,
  username,
  onRetry,
}: {
  error: unknown
  username: string
  onRetry: () => void
}) {
  const notFound = error instanceof ApiError && error.status === 404
  const rateLimited = error instanceof ApiError && error.status === 429
  const Icon = notFound ? SearchXIcon : TriangleAlertIcon

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Icon />
          </EmptyMedia>
          <EmptyTitle>
            {notFound
              ? `No GitHub user named "${username}"`
              : rateLimited
                ? "GitHub rate limit reached"
                : "Could not load this profile"}
          </EmptyTitle>
          <EmptyDescription>
            {notFound
              ? "Check the spelling and try again."
              : error instanceof ApiError
                ? error.message
                : "Something went wrong."}
          </EmptyDescription>
        </EmptyHeader>
        {!notFound && (
          <EmptyContent>
            <Button onClick={onRetry}>Try again</Button>
          </EmptyContent>
        )}
      </Empty>
      <SearchBar />
    </div>
  )
}

export function ProfilePage() {
  const { username = "" } = useParams()
  const { data, isPending, error, refetch } = useDeveloper(username)

  if (isPending) return <ProfileSkeleton />
  if (error || !data) {
    return (
      <ProfileError
        error={error}
        username={username}
        onRetry={() => void refetch()}
      />
    )
  }

  const { developer, meta } = data
  const enriching =
    developer.enrichmentStatus === "pending" ||
    developer.enrichmentStatus === "running"

  return (
    <div className="flex flex-col gap-6">
      <ProfileHeader result={data} />
      <EnrichmentNotice
        status={developer.enrichmentStatus}
        sampledRepos={meta.sampledRepos}
      />
      <MetricCards developer={developer} enriching={enriching} />
      <div className="grid gap-4 lg:grid-cols-2">
        <LanguageChart
          languages={developer.metrics.languages}
          loading={enriching}
        />
        <CommitChart
          weeks={developer.metrics.weeklyCommits}
          total={developer.metrics.commits52w}
          loading={enriching}
        />
      </div>
      <RepoList
        key={developer.profile.username}
        username={developer.profile.username}
        languages={developer.metrics.languages}
      />
    </div>
  )
}
