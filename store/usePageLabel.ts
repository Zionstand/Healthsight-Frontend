import { create } from "zustand"

/**
 * The human name of the record on screen (a patient's name, a period title),
 * keyed by path so a stale label never shows on another page. Breadcrumbs use
 * it for the last crumb instead of an ID.
 */
export const usePageLabel = create<{
  path: string | null
  label: string | null
  set: (path: string, label: string) => void
  clear: (path: string) => void
}>((set) => ({
  path: null,
  label: null,
  set: (path, label) => set({ path, label }),
  clear: (path) => set((s) => (s.path === path ? { path: null, label: null } : s)),
}))
