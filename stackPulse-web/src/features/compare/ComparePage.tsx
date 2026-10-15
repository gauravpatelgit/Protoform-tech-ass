import { GitCompareArrowsIcon, TriangleAlertIcon } from "lucide-react"

import { MIN_COMPARE, useCompare } from "@/api/compare"
import { ApiError } from "@/api/client"
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
import { CompareView } from "@/features/compare/CompareView"
import { DeveloperPicker } from "@/features/compare/DeveloperPicker"
import { SaveComparisonDialog } from "@/features/compare/SaveComparisonDialog"
import { useSelectedUsernames } from "@/features/compare/useSelectedUsernames"

function CompareSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-72 w-full" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-52" />
        ))}
      </div>
    </div>
  )
}

export function ComparePage() {
  const { usernames, add, remove } = useSelectedUsernames()
  const ready = usernames.length >= MIN_COMPARE
  const { data, isPending, error, refetch } = useCompare(usernames)

  const savable =
    ready && !!data && data.developers.some((entry) => entry.status === "ok")

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Compare</h1>
          <p className="text-sm text-muted-foreground">
            Add two to five GitHub developers to see them side by side.
          </p>
        </div>
        <SaveComparisonDialog usernames={usernames} disabled={!savable} />
      </div>

      <DeveloperPicker usernames={usernames} onAdd={add} onRemove={remove} />

      {!ready ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GitCompareArrowsIcon />
            </EmptyMedia>
            <EmptyTitle>Pick at least {MIN_COMPARE} developers</EmptyTitle>
            <EmptyDescription>
              {usernames.length === 0
                ? "Add usernames above to start comparing."
                : "Add one more username to see the comparison."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : isPending ? (
        <CompareSkeleton />
      ) : error || !data ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TriangleAlertIcon />
            </EmptyMedia>
            <EmptyTitle>Could not load the comparison</EmptyTitle>
            <EmptyDescription>
              {error instanceof ApiError
                ? error.message
                : "Something went wrong."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => void refetch()}>Try again</Button>
          </EmptyContent>
        </Empty>
      ) : (
        <CompareView result={data} usernames={usernames} />
      )}
    </div>
  )
}
