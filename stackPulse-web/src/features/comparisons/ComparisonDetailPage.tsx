import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeftIcon, TriangleAlertIcon } from "lucide-react"

import { ApiError } from "@/api/client"
import { useComparison } from "@/api/comparisons"
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
import { DeleteComparisonButton } from "@/features/comparisons/DeleteComparisonButton"
import { RenameComparisonDialog } from "@/features/comparisons/RenameComparisonDialog"
import { formatRelativeTime } from "@/lib/format"

export function ComparisonDetailPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const { data, isPending, error } = useComparison(id)

  if (isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (error || !data) {
    const notFound = error instanceof ApiError && error.status === 404
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TriangleAlertIcon />
          </EmptyMedia>
          <EmptyTitle>
            {notFound ? "Comparison not found" : "Could not load comparison"}
          </EmptyTitle>
          <EmptyDescription>
            {error instanceof ApiError
              ? error.message
              : "Something went wrong."}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link to="/comparisons">Back to saved comparisons</Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" className="-ml-2" asChild>
            <Link to="/comparisons">
              <ArrowLeftIcon data-icon="inline-start" />
              Saved comparisons
            </Link>
          </Button>
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {data.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Saved {formatRelativeTime(data.createdAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <RenameComparisonDialog
            key={data.name}
            id={data.id}
            name={data.name}
          />
          <DeleteComparisonButton
            id={data.id}
            name={data.name}
            onDeleted={() => void navigate("/comparisons", { replace: true })}
          />
        </div>
      </div>
      <CompareView
        result={data.compare}
        usernames={data.developers.map((developer) => developer.username)}
      />
    </div>
  )
}
