"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useDebouncedValue } from "./use-debounced-value"

type Defaults = Record<string, string | number>
type Values<T extends Defaults> = { [K in keyof T]: T[K] extends number ? number : string }

/**
 * List filters that live in the URL, so Back, refresh and a shared link all
 * reopen the same view. Values equal to their default are left out of the URL.
 * Changing any filter other than `page` goes back to page 1.
 */
export function useListParams<T extends Defaults>(defaults: T) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const values = useMemo(() => {
    const out: Record<string, string | number> = {}
    for (const [key, def] of Object.entries(defaults)) {
      const raw = sp.get(key)
      if (raw === null) out[key] = def
      else if (typeof def === "number") {
        const n = Number(raw)
        out[key] = Number.isFinite(n) && n > 0 ? n : def
      } else out[key] = raw
    }
    return out as Values<T>
    // defaults are a literal per screen; only the URL changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp])

  const set = useCallback(
    (patch: Partial<Values<T>>) => {
      const next = new URLSearchParams(sp.toString())
      const resetsPage = Object.keys(patch).some((k) => k !== "page")
      const merged = { ...patch } as Record<string, string | number | undefined>
      if (resetsPage && "page" in defaults && !("page" in patch)) merged.page = defaults.page
      for (const [key, value] of Object.entries(merged)) {
        if (value === undefined || value === "" || value === defaults[key]) next.delete(key)
        else next.set(key, String(value))
      }
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sp, pathname, router]
  )

  return [values, set] as const
}

/**
 * A search box bound to a URL param: typing is instant, the URL (and the
 * query) follow once typing pauses.
 */
export function useSearchParam(
  value: string,
  onCommit: (value: string) => void,
  ms = 350
) {
  const [text, setText] = useState(value)
  const debounced = useDebouncedValue(text, ms)

  useEffect(() => {
    if (debounced !== value) onCommit(debounced)
    // commit only when the typed text settles
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  return [text, setText] as const
}
