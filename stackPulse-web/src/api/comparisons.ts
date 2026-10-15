import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { isEnriching } from "@/api/compare"
import { request } from "@/api/client"
import type { Page, SavedComparison, SavedComparisonDetail } from "@/api/types"

const POLL_INTERVAL_MS = 3000
const MAX_POLLS = 40

export const comparisonKeys = {
  list: ["comparisons"] as const,
  detail: (id: number | string) => ["comparisons", String(id)] as const,
}

export interface CreateComparisonInput {
  name: string
  usernames: string[]
}

export interface UpdateComparisonInput {
  name?: string
  usernames?: string[]
}

export function useComparisons(page: number, limit: number) {
  return useQuery({
    queryKey: [...comparisonKeys.list, "list", page, limit],
    queryFn: async () => {
      const { data, meta } = await request<SavedComparison[], Page>(
        "/comparisons",
        { query: { page, limit } }
      )
      return { comparisons: data, page: meta }
    },
    placeholderData: keepPreviousData,
  })
}

export function useComparison(id: string) {
  return useQuery({
    queryKey: comparisonKeys.detail(id),
    queryFn: async () =>
      (await request<SavedComparisonDetail>(`/comparisons/${id}`)).data,
    refetchInterval: (query) =>
      isEnriching(query.state.data?.compare) &&
      query.state.dataUpdateCount < MAX_POLLS
        ? POLL_INTERVAL_MS
        : false,
  })
}

export function useCreateComparison() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateComparisonInput) =>
      (
        await request<SavedComparison>("/comparisons", {
          method: "POST",
          body: input,
        })
      ).data,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: comparisonKeys.list }),
  })
}

export function useUpdateComparison(id: number | string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateComparisonInput) =>
      (
        await request<SavedComparison>(`/comparisons/${id}`, {
          method: "PUT",
          body: input,
        })
      ).data,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: comparisonKeys.list }),
  })
}

export function useDeleteComparison() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await request<void>(`/comparisons/${id}`, { method: "DELETE" })
    },
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: comparisonKeys.detail(id) })
      return queryClient.invalidateQueries({
        queryKey: [...comparisonKeys.list, "list"],
      })
    },
  })
}
