import { useState } from "react"
import { ArrowRightIcon, SearchIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { isValidGithubUsername } from "@/lib/github"
import { cn } from "@/lib/utils"

export function SearchBar({ className }: { className?: string }) {
  const navigate = useNavigate()
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | null>(null)

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const username = value.trim().replace(/^@/, "")
    if (!isValidGithubUsername(username)) {
      setError("Enter a valid GitHub username")
      return
    }
    setError(null)
    navigate(`/d/${encodeURIComponent(username)}`)
  }

  return (
    <form onSubmit={onSubmit} className={cn("w-full", className)} role="search">
      <InputGroup className="h-11">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            setError(null)
          }}
          placeholder="GitHub username, e.g. torvalds"
          aria-label="GitHub username"
          aria-invalid={!!error}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton type="submit" variant="default" size="sm">
            Look up
            <ArrowRightIcon data-icon="inline-end" />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}
