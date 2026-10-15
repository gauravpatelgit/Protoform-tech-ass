import { useState } from "react"
import { Link } from "react-router-dom"
import { SaveIcon } from "lucide-react"

import { useComparisons } from "@/api/comparisons"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { DeleteComparisonButton } from "@/features/comparisons/DeleteComparisonButton"
import { formatRelativeTime } from "@/lib/format"

const PAGE_SIZE = 12

export function SavedComparisonsPage() {
  const [page, setPage] = useState(1)
  const { data, isPending, isError, isPlaceholderData } = useComparisons(
    page,
    PAGE_SIZE
  )
  const totalPages = data
    ? Math.max(1, Math.ceil(data.page.total / PAGE_SIZE))
    : 1

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Saved comparisons
        </h1>
        <p className="text-sm text-muted-foreground">
          Reopen a comparison with up to date metrics.
        </p>
      </div>

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-36" />
          ))}
        </div>
      ) : isError ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Could not load comparisons</EmptyTitle>
            <EmptyDescription>Please try again in a moment.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : data.comparisons.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SaveIcon />
            </EmptyMedia>
            <EmptyTitle>No saved comparisons</EmptyTitle>
            <EmptyDescription>
              Compare developers and save the result to find it here later.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link to="/compare">Start comparing</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <ul
          className={
            "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" +
            (isPlaceholderData ? " opacity-60 transition-opacity" : "")
          }
        >
          {data.comparisons.map((comparison) => (
            <li key={comparison.id}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="truncate">
                    <Link
                      to={`/comparisons/${comparison.id}`}
                      className="hover:underline"
                    >
                      {comparison.name}
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    Saved {formatRelativeTime(comparison.createdAt)}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="justify-between gap-2">
                  <div className="flex -space-x-2">
                    {comparison.developers.map((developer) => (
                      <Avatar key={developer.username} size="sm">
                        <AvatarImage
                          src={developer.avatarUrl}
                          alt={developer.username}
                        />
                        <AvatarFallback>
                          {developer.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/comparisons/${comparison.id}`}>Open</Link>
                    </Button>
                    <DeleteComparisonButton
                      id={comparison.id}
                      name={comparison.name}
                    />
                  </div>
                </CardFooter>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
