import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"

import { request } from "@/api/client"
import type { Page, Pin, PinInput, PinListQuery, Repo } from "@/api/types"

export const pinKeys = {
  all: ["pins"] as const,
  list: (query: PinListQuery) => ["pins", "list", query] as const,
  detail: (id: number) => ["pins", "detail", id] as const,
}

interface CachedRepos {
  repos: Repo[]
  page: Page
}

const isRepoListQuery = (key: readonly unknown[]) =>
  key[0] === "developer" && key[2] === "repos"

// Pin state is embedded in cached repo lists, so patch them in place for instant feedback.
function patchCachedRepo(
  queryClient: QueryClient,
  repoId: number,
  patch: Partial<Repo>
) {
  queryClient.setQueriesData<CachedRepos>(
    { predicate: (query) => isRepoListQuery(query.queryKey) },
    (data) =>
      data && {
        ...data,
        repos: data.repos.map((repo) =>
          repo.id === repoId ? { ...repo, ...patch } : repo
        ),
      }
  )
}

function snapshotRepoLists(queryClient: QueryClient) {
  return queryClient.getQueriesData<CachedRepos>({
    predicate: (query) => isRepoListQuery(query.queryKey),
  })
}

export function usePins(query: PinListQuery) {
  return useQuery({
    queryKey: pinKeys.list(query),
    queryFn: async () => {
      const { data, meta } = await request<Pin[], Page>("/pins", {
        query: { ...query },
      })
      return { pins: data, page: meta }
    },
    placeholderData: keepPreviousData,
  })
}

export function usePin(id: number | null) {
  return useQuery({
    queryKey: pinKeys.detail(id ?? 0),
    queryFn: async () => (await request<Pin>(`/pins/${id}`)).data,
    enabled: id !== null,
  })
}

export function useCreatePin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ repoId, ...input }: PinInput & { repoId: number }) =>
      (
        await request<Pin>("/pins", {
          method: "POST",
          body: { repoId, ...input },
        })
      ).data,
    onMutate: async ({ repoId }) => {
      await queryClient.cancelQueries({
        predicate: (query) => isRepoListQuery(query.queryKey),
      })
      const snapshot = snapshotRepoLists(queryClient)
      patchCachedRepo(queryClient, repoId, { pinned: true })
      return { snapshot }
    },
    onError: (_error, _input, context) => {
      for (const [key, data] of context?.snapshot ?? []) {
        queryClient.setQueryData(key, data)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: pinKeys.all })
      void queryClient.invalidateQueries({
        predicate: (query) => isRepoListQuery(query.queryKey),
      })
    },
  })
}

export function useUpdatePin(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: PinInput) =>
      (await request<Pin>(`/pins/${id}`, { method: "PATCH", body: input }))
        .data,
    onSuccess: (pin) => {
      queryClient.setQueryData(pinKeys.detail(id), pin)
      void queryClient.invalidateQueries({ queryKey: ["pins", "list"] })
    },
  })
}

export function useDeletePin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: number; repoId?: number }) => {
      await request<void>(`/pins/${id}`, { method: "DELETE" })
    },
    onMutate: async ({ repoId }) => {
      if (repoId === undefined) return { snapshot: [] }
      await queryClient.cancelQueries({
        predicate: (query) => isRepoListQuery(query.queryKey),
      })
      const snapshot = snapshotRepoLists(queryClient)
      patchCachedRepo(queryClient, repoId, { pinned: false, pinId: null })
      return { snapshot }
    },
    onError: (_error, _input, context) => {
      for (const [key, data] of context?.snapshot ?? []) {
        queryClient.setQueryData(key, data)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: pinKeys.all })
      void queryClient.invalidateQueries({
        predicate: (query) => isRepoListQuery(query.queryKey),
      })
    },
  })
}
