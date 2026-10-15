import { useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  BookmarkIcon,
  PencilIcon,
  StarIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { useDeletePin, usePins } from "@/api/pins"
import type { Pin } from "@/api/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { PinEditorDialog } from "@/features/pins/PinEditorDialog"
import { languageColor } from "@/lib/colors"
import { formatCompact } from "@/lib/format"

const PAGE_SIZE = 12

function PinCard({
  pin,
  onEdit,
  onTag,
}: {
  pin: Pin
  onEdit: () => void
  onTag: (tag: string) => void
}) {
  const remove = useDeletePin()
  const { repo } = pin

  return (
    <Card>
      <CardHeader>
        <CardTitle className="min-w-0 truncate">
          <a
            href={repo.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            {repo.name}
          </a>
        </CardTitle>
        <Link
          to={`/d/${repo.developerUsername}`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <Avatar size="sm">
            <AvatarImage src={repo.developerAvatarUrl} alt="" />
            <AvatarFallback>
              {repo.developerUsername.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {repo.developerUsername}
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {repo.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {repo.description}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {repo.primaryLanguage && (
            <span className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: languageColor(repo.primaryLanguage) }}
              />
              {repo.primaryLanguage}
            </span>
          )}
          <span className="flex items-center gap-1">
            <StarIcon className="size-3.5" />
            {formatCompact(repo.stars)}
          </span>
        </div>
        {pin.note && (
          <p className="rounded-lg bg-muted p-2 text-sm whitespace-pre-wrap">
            {pin.note}
          </p>
        )}
        {pin.tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
            {pin.tags.map((tag) => (
              <li key={tag}>
                <Badge variant="secondary" className="cursor-pointer" asChild>
                  <button type="button" onClick={() => onTag(tag)}>
                    {tag}
                  </button>
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <PencilIcon data-icon="inline-start" />
          Edit
        </Button>
        <Button
          variant="destructive"
          size="sm"
          disabled={remove.isPending}
          onClick={() =>
            remove.mutate(
              { id: pin.id },
              { onSuccess: () => toast.success("Pin removed") }
            )
          }
        >
          <Trash2Icon data-icon="inline-start" />
          Unpin
        </Button>
      </CardFooter>
    </Card>
  )
}

export function PinsPage() {
  const [params, setParams] = useSearchParams()
  const [editingId, setEditingId] = useState<number | null>(null)
  const tag = params.get("tag") ?? undefined
  const page = Math.max(1, Number(params.get("page")) || 1)

  const { data, isPending, isError, isPlaceholderData } = usePins({
    tag,
    page,
    limit: PAGE_SIZE,
  })

  const update = (next: { tag?: string; page?: number }) => {
    const merged = new URLSearchParams(params)
    if ("tag" in next) {
      if (next.tag) merged.set("tag", next.tag)
      else merged.delete("tag")
      merged.delete("page")
    }
    if (next.page) merged.set("page", String(next.page))
    setParams(merged)
  }

  const totalPages = data
    ? Math.max(1, Math.ceil(data.page.total / PAGE_SIZE))
    : 1

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pins</h1>
          <p className="text-sm text-muted-foreground">
            Repositories you saved, with your own notes and tags.
          </p>
        </div>
        {tag && (
          <Button variant="outline" onClick={() => update({ tag: undefined })}>
            Tag: {tag}
            <XIcon data-icon="inline-end" />
          </Button>
        )}
      </div>

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-56" />
          ))}
        </div>
      ) : isError ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Could not load your pins</EmptyTitle>
            <EmptyDescription>Please try again in a moment.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : data.pins.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookmarkIcon />
            </EmptyMedia>
            <EmptyTitle>
              {tag ? "No pins with this tag" : "No pins yet"}
            </EmptyTitle>
            <EmptyDescription>
              {tag
                ? "Clear the filter to see all pins."
                : "Open a developer profile and pin repositories to keep them here."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div
          className={
            "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" +
            (isPlaceholderData ? " opacity-60 transition-opacity" : "")
          }
        >
          {data.pins.map((pin) => (
            <PinCard
              key={pin.id}
              pin={pin}
              onEdit={() => setEditingId(pin.id)}
              onTag={(value) => update({ tag: value })}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => update({ page: page - 1 })}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => update({ page: page + 1 })}
          >
            Next
          </Button>
        </div>
      )}

      <PinEditorDialog
        pinId={editingId}
        open={editingId !== null}
        onOpenChange={(open) => {
          if (!open) setEditingId(null)
        }}
      />
    </div>
  )
}
