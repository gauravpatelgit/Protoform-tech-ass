import { useQuery } from "@tanstack/react-query"

import { request } from "@/api/client"
import type { CompareResult } from "@/api/types"

export const MIN_COMPARE = 2
export const MAX_COMPARE = 5

const POLL_INTERVAL_MS = 3000
const MAX_POLLS = 40

export const compareKeys = {
  result: (usernames: string[]) =>
    ["compare", [...usernames].map((u) => u.toLowerCase()).sort()] as const,
}

export function isEnriching(result: CompareResult | undefined) {
  return !!result?.developers.some(
    (entry) =>
      entry.enrichmentStatus === "pending" ||
      entry.enrichmentStatus === "running"
  )
}

export function useCompare(usernames: string[]) {
  return useQuery({
    queryKey: compareKeys.result(usernames),
    enabled: usernames.length >= MIN_COMPARE,
    queryFn: async () =>
      (
        await request<CompareResult>("/compare", {
          query: { usernames },
        })
      ).data,
    refetchInterval: (query) =>
      isEnriching(query.state.data) && query.state.dataUpdateCount < MAX_POLLS
        ? POLL_INTERVAL_MS
        : false,
  })
}
