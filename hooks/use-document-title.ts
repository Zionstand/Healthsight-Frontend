"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { pageTitle } from "@/lib/seo"
import { usePageLabel } from "@/store/usePageLabel"

/**
 * Names the screen: sets the tab title to "<title> | Healthsight" and gives the
 * breadcrumbs a readable last crumb (e.g. the patient's name, not their ID).
 * Pass a falsy value while data is still loading to keep the inherited title.
 */
export function useDocumentTitle(title?: string | null) {
  const pathname = usePathname()
  const setLabel = usePageLabel((s) => s.set)
  const clearLabel = usePageLabel((s) => s.clear)

  useEffect(() => {
    if (!title) return
    const previous = document.title
    document.title = pageTitle(title)
    setLabel(pathname, title)
    return () => {
      document.title = previous
      clearLabel(pathname)
    }
  }, [title, pathname, setLabel, clearLabel])
}
