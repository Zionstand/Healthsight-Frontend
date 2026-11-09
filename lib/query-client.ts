import { QueryCache, QueryClient, isServer } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiErrorMessage, apiErrorStatus } from "./api-error"

declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: { errorMessage?: string; silent?: boolean }
  }
}

function makeQueryClient() {
  return new QueryClient({
    // One place reports load failures. Only when there's nothing on screen:
    // a failed background refresh keeps the last good data quietly.
    queryCache: new QueryCache({
      onError: (err, query) => {
        if (query.meta?.silent || query.state.data !== undefined) return
        if (apiErrorStatus(err) === 401) return // the session handler takes over
        toast.error(apiErrorMessage(err, query.meta?.errorMessage), {
          id: String(query.queryHash),
        })
      },
    }),
    defaultOptions: {
      queries: {
        // Revisiting a screen within 30s shows the cached data instantly;
        // after that it still shows instantly and refreshes in the background.
        staleTime: 30_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: true,
        // Retry once for network blips and Render cold starts, never for
        // answers that won't change (permission, not found, validation).
        retry: (count, err) => {
          const s = apiErrorStatus(err)
          return count < 1 && (s === 0 || s >= 500)
        },
      },
      mutations: { retry: false },
    },
  })
}

let browserClient: QueryClient | undefined

/**
 * One cache per browser tab; a fresh one per server render so no data is
 * ever shared between visitors.
 */
export function getQueryClient() {
  if (isServer) return makeQueryClient()
  return (browserClient ??= makeQueryClient())
}

export const queryClient = {
  clear: () => browserClient?.clear(),
}
