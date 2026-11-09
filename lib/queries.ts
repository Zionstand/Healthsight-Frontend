"use client"

import {
  keepPreviousData,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query"
import api from "./api"

export type Params = Record<string, string | number | boolean | null | undefined>

/** Drops empty filters so "" and undefined don't create separate cache entries. */
function clean(params?: Params) {
  if (!params) return undefined
  const out: Params = {}
  for (const [k, v] of Object.entries(params)) if (v !== "" && v != null) out[k] = v
  return Object.keys(out).length ? out : undefined
}

export async function apiGet<T>(path: string, params?: Params): Promise<T> {
  return (await api.get<T>(path, { params: clean(params) })).data
}

/**
 * Cached GET. The key starts with the path, so invalidating "/patients" after a
 * save refreshes every patient list and filter combination at once.
 *
 * `keepPrevious` keeps the old rows on screen while the next page or filter
 * loads, instead of flashing an empty table.
 */
export function useApiQuery<T>(
  path: string | null,
  {
    params,
    keepPrevious,
    errorMessage,
    silent,
    ...options
  }: {
    params?: Params
    keepPrevious?: boolean
    /** Shown if the first load fails. */
    errorMessage?: string
    /** The screen shows its own error state, so no toast. */
    silent?: boolean
  } & Omit<UseQueryOptions<T>, "queryKey" | "queryFn"> = {}
) {
  const p = clean(params)
  return useQuery<T>({
    queryKey: p ? [path, p] : [path],
    queryFn: () => apiGet<T>(path!, p),
    enabled: path !== null && (options.enabled ?? true),
    placeholderData: keepPrevious ? keepPreviousData : undefined,
    meta: { errorMessage, silent },
    ...options,
  })
}

/** Refreshes every cached query under the given paths, e.g. after a save. */
export function useInvalidate() {
  const qc = useQueryClient()
  return (...paths: string[]) =>
    Promise.all(paths.map((p) => qc.invalidateQueries({ queryKey: [p] })))
}

type Updater<T> = T | null | ((prev: T | null) => T | null)

/**
 * A cached GET that a screen can also edit locally, like useState: after a
 * save, `setData` updates what's on screen (and in the cache, so going back
 * and forth shows the edit) without waiting for a refetch.
 */
export function useApiState<T>(
  path: string | null,
  options: Parameters<typeof useApiQuery<T>>[1] = {}
) {
  const qc = useQueryClient()
  const query = useApiQuery<T>(path, options)
  const p = clean(options.params)
  const key = p ? [path, p] : [path]

  const setData = (next: Updater<T>) =>
    qc.setQueryData<T>(key, (prev) => {
      const value =
        typeof next === "function"
          ? (next as (prev: T | null) => T | null)(prev ?? null)
          : next
      return value ?? undefined
    })

  return { ...query, data: query.data ?? null, setData }
}
