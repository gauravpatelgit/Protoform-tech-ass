import { useCallback, useMemo } from "react"
import { useSearchParams } from "react-router-dom"

import { MAX_COMPARE } from "@/api/compare"
import { isValidGithubUsername } from "@/lib/github"

// The selection lives in the URL (?u=a&u=b) so a comparison is shareable and survives reloads.
export function useSelectedUsernames() {
  const [params, setParams] = useSearchParams()

  const usernames = useMemo(() => {
    const seen = new Set<string>()
    const result: string[] = []
    for (const raw of params.getAll("u")) {
      const username = raw.trim()
      const key = username.toLowerCase()
      if (!isValidGithubUsername(username) || seen.has(key)) continue
      seen.add(key)
      result.push(username)
    }
    return result.slice(0, MAX_COMPARE)
  }, [params])

  const update = useCallback(
    (next: string[]) => {
      setParams({ u: next }, { replace: true })
    },
    [setParams]
  )

  const add = useCallback(
    (username: string) => {
      if (usernames.some((u) => u.toLowerCase() === username.toLowerCase()))
        return
      update([...usernames, username])
    },
    [usernames, update]
  )

  const remove = useCallback(
    (username: string) => update(usernames.filter((u) => u !== username)),
    [usernames, update]
  )

  return { usernames, add, remove }
}
