"use client"

import { useMemo } from "react"
import type { Icon } from "@tabler/icons-react"
import type { LucideIcon } from "lucide-react"
import { useAuth } from "@/store/useAuth"
import { getNavByRole } from "@/lib/getNavByRole"
import {
  managementLinks,
  operationsLinks,
  settingsLinks,
} from "@/features/admin/components/AdminSidebar"

export type NavItem = { label: string; href: string; icon?: Icon | LucideIcon }

/** Every screen the signed-in person can open, in menu order. */
export function useNavItems(): NavItem[] {
  const { user } = useAuth()
  return useMemo(() => {
    const isAdmin = !!user?.roles?.some((r) => r.name === "ADMIN")
    if (isAdmin) return [...managementLinks, ...operationsLinks, ...settingsLinks]
    return getNavByRole(user)
      .filter((l: { comingSoon?: boolean }) => !l.comingSoon)
      .map((l: { label: string; slug: string; icon?: Icon | LucideIcon }) => ({
        label: l.label,
        href: l.slug,
        icon: l.icon,
      }))
  }, [user])
}
