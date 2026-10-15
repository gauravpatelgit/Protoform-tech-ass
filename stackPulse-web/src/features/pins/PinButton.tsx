import { useState } from "react"
import { BookmarkCheckIcon, BookmarkIcon, PencilIcon } from "lucide-react"
import { toast } from "sonner"

import { ApiError } from "@/api/client"
import { useCreatePin, useDeletePin } from "@/api/pins"
import type { Repo } from "@/api/types"
import { Button } from "@/components/ui/button"
import { PinEditorDialog } from "@/features/pins/PinEditorDialog"

export function PinButton({ repo }: { repo: Repo }) {
  const [editing, setEditing] = useState(false)
  const create = useCreatePin()
  const remove = useDeletePin()
  const pinned = !!repo.pinned

  const toggle = () => {
    const onError = (error: Error) =>
      toast.error(error instanceof ApiError ? error.message : "Action failed")

    if (pinned) {
      if (repo.pinId == null) return
      remove.mutate(
        { id: repo.pinId, repoId: repo.id },
        { onSuccess: () => toast.success("Pin removed"), onError }
      )
    } else {
      create.mutate(
        { repoId: repo.id },
        { onSuccess: () => toast.success("Repository pinned"), onError }
      )
    }
  }

  return (
    <div className="flex items-center">
      {pinned && repo.pinId != null && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setEditing(true)}
          aria-label={`Edit note and tags for ${repo.name}`}
        >
          <PencilIcon />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={toggle}
        aria-pressed={pinned}
        aria-label={pinned ? `Unpin ${repo.name}` : `Pin ${repo.name}`}
      >
        {pinned ? (
          <BookmarkCheckIcon className="text-primary" />
        ) : (
          <BookmarkIcon />
        )}
      </Button>
      {pinned && repo.pinId != null && (
        <PinEditorDialog
          pinId={repo.pinId}
          open={editing}
          onOpenChange={setEditing}
        />
      )}
    </div>
  )
}
