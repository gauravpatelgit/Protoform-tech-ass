import { useState } from "react"
import { PlusIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { usePin, useUpdatePin } from "@/api/pins"
import { ApiError } from "@/api/client"
import type { Pin } from "@/api/types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"

export const MAX_NOTE_LENGTH = 2000
export const MAX_TAGS = 10
const MAX_TAG_LENGTH = 30

const normalizeTag = (raw: string) =>
  raw.trim().replace(/^#/, "").toLowerCase().slice(0, MAX_TAG_LENGTH)

function PinForm({ pin, onDone }: { pin: Pin; onDone: () => void }) {
  const [note, setNote] = useState(pin.note ?? "")
  const [tags, setTags] = useState(pin.tags)
  const [draft, setDraft] = useState("")
  const [error, setError] = useState<string | null>(null)
  const update = useUpdatePin(pin.id)

  const addTag = () => {
    const tag = normalizeTag(draft)
    if (!tag) return
    if (tags.length >= MAX_TAGS) {
      setError(`You can add up to ${MAX_TAGS} tags`)
      return
    }
    if (!tags.includes(tag)) setTags([...tags, tag])
    setDraft("")
    setError(null)
  }

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    update.mutate(
      { note: note.trim() || null, tags },
      {
        onSuccess: () => {
          toast.success("Pin updated")
          onDone()
        },
        onError: (err) =>
          setError(err instanceof ApiError ? err.message : "Could not save"),
      }
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <FieldGroup>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Field>
          <FieldLabel htmlFor="pin-note">Note</FieldLabel>
          <Textarea
            id="pin-note"
            value={note}
            maxLength={MAX_NOTE_LENGTH}
            rows={4}
            placeholder="Why is this repo worth remembering?"
            onChange={(event) => setNote(event.target.value)}
          />
          <FieldDescription>
            {note.length}/{MAX_NOTE_LENGTH}
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="pin-tag">Tags</FieldLabel>
          <div className="flex gap-2">
            <Input
              id="pin-tag"
              value={draft}
              maxLength={MAX_TAG_LENGTH}
              placeholder="Add a tag and press Enter"
              autoComplete="off"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === ",") {
                  event.preventDefault()
                  addTag()
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={addTag}
              aria-label="Add tag"
            >
              <PlusIcon />
            </Button>
          </div>
          {tags.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Tags">
              {tags.map((tag) => (
                <li key={tag}>
                  <Badge variant="secondary" className="h-6 gap-1 pr-0.5">
                    {tag}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="rounded-full"
                      onClick={() => setTags(tags.filter((t) => t !== tag))}
                      aria-label={`Remove tag ${tag}`}
                    >
                      <XIcon />
                    </Button>
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button type="submit" disabled={update.isPending}>
          {update.isPending && <Spinner data-icon="inline-start" />}
          Save
        </Button>
      </DialogFooter>
    </form>
  )
}

export function PinEditorDialog({
  pinId,
  open,
  onOpenChange,
}: {
  pinId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: pin, isPending, isError } = usePin(open ? pinId : null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit pin</DialogTitle>
          <DialogDescription>
            {pin
              ? pin.repo.fullName
              : "Add a note and tags to this repository."}
          </DialogDescription>
        </DialogHeader>
        {isError ? (
          <Alert variant="destructive">
            <AlertDescription>Could not load this pin.</AlertDescription>
          </Alert>
        ) : isPending || !pin ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <PinForm pin={pin} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}
