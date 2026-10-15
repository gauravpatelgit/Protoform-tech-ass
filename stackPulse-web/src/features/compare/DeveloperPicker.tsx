import { useState } from "react"
import { PlusIcon, XIcon } from "lucide-react"

import { MAX_COMPARE } from "@/api/compare"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { DEVELOPER_COLORS } from "@/lib/colors"
import { isValidGithubUsername } from "@/lib/github"

export function DeveloperPicker({
  usernames,
  onAdd,
  onRemove,
}: {
  usernames: string[]
  onAdd: (username: string) => void
  onRemove: (username: string) => void
}) {
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | null>(null)
  const full = usernames.length >= MAX_COMPARE

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const username = value.trim().replace(/^@/, "")
    if (!isValidGithubUsername(username)) {
      setError("Enter a valid GitHub username")
      return
    }
    if (usernames.some((u) => u.toLowerCase() === username.toLowerCase())) {
      setError("Already added")
      return
    }
    onAdd(username)
    setValue("")
    setError(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={submit}>
        <InputGroup className="h-11 sm:max-w-md">
          <InputGroupInput
            value={value}
            disabled={full}
            onChange={(event) => {
              setValue(event.target.value)
              setError(null)
            }}
            placeholder={
              full
                ? `Maximum of ${MAX_COMPARE} developers`
                : "Add a GitHub username"
            }
            aria-label="Add developer to compare"
            aria-invalid={!!error}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton type="submit" size="sm" disabled={full}>
              <PlusIcon data-icon="inline-start" />
              Add
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        {error && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </form>

      {usernames.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Selected developers">
          {usernames.map((username, index) => (
            <li
              key={username}
              className="flex items-center gap-2 rounded-full border py-1 pr-1 pl-3 text-sm"
            >
              <span
                className="size-2.5 rounded-full"
                style={{
                  backgroundColor:
                    DEVELOPER_COLORS[index % DEVELOPER_COLORS.length],
                }}
              />
              {username}
              <Button
                variant="ghost"
                size="icon-xs"
                className="rounded-full"
                onClick={() => onRemove(username)}
                aria-label={`Remove ${username}`}
              >
                <XIcon />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
