import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { request } from "@/api/client"
import type {
  Developer,
  DeveloperMeta,
  Page,
  RecentDeveloper,
  Repo,
  RepoListQuery,
} from "@/api/types"

export const developerKeys = {
  recent: ["developers", "recent"] as const,
  detail: (username: string) => ["developer", username.toLowerCase()] as const,
  repos: (username: string, query: RepoListQuery) =>
    ["developer", username.toLowerCase(), "repos", query] as const,
}

export interface DeveloperResult {
  developer: Developer
  meta: DeveloperMeta
}

const POLL_INTERVAL_MS = 2000
const MAX_POLLS = 60

export function useRecentDevelopers() {
  return useQuery({
    queryKey: developerKeys.recent,
    queryFn: async () =>
      (await request<RecentDeveloper[]>("/developers/recent")).data,
  })
}

async function fetchDeveloper(
  path: string,
  method: "GET" | "POST"
): Promise<DeveloperResult> {
  const { data, meta } = await request<Developer, DeveloperMeta>(path, {
    method,
  })
  return { developer: data, meta }
}

export function useDeveloper(username: string) {
  return useQuery({
    queryKey: developerKeys.detail(username),
    queryFn: () =>
      fetchDeveloper(`/developers/${encodeURIComponent(username)}`, "GET"),
    // The backend enriches languages and commits in the background; poll until it settles.
    refetchInterval: (query) => {
      const status = query.state.data?.developer.enrichmentStatus
      const active = status === "pending" || status === "running"
      return active && query.state.dataUpdateCount < MAX_POLLS
        ? POLL_INTERVAL_MS
        : false
    },
  })
}

export function useRefreshDeveloper(username: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      fetchDeveloper(
        `/developers/${encodeURIComponent(username)}/refresh`,
        "POST"
      ),
    onSuccess: (result) => {
      queryClient.setQueryData(developerKeys.detail(username), result)
      void queryClient.invalidateQueries({
        queryKey: [...developerKeys.detail(username), "repos"],
      })
    },
  })
}

export function useDeveloperRepos(username: string, query: RepoListQuery) {
  return useQuery({
    queryKey: developerKeys.repos(username, query),
    queryFn: async () => {
      const { data, meta } = await request<Repo[], Page>(
        `/developers/${encodeURIComponent(username)}/repos`,
        { query: { ...query } }
      )
      return { repos: data, page: meta }
    },
    placeholderData: keepPreviousData,
  })
}
