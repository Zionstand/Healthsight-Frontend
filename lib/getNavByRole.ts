import { User } from "@/store/useAuth"
import { adminNavLinks, healthStaffNavLinks } from "@/constants/nav-links"
import { roleNavMap } from "@/constants/roleNavMap"
import { IconChartBar } from "@tabler/icons-react"

type AdminNavItem = { slug: string; module?: string; superAdminOnly?: boolean }

// Power BI assessment report. Admins reach it from the admin sidebar
// (/admin/analytics); on the staff side only directors get the link. The
// backend enforces the same rule (GET /analytics/powerbi).
const analyticsLink = { label: "Assessment analysis", slug: "/analytics", icon: IconChartBar }

export const canViewAnalytics = (user?: User | null) =>
  !!user?.roles?.some((r) => r.name === "ADMIN" || r.name === "DIRECTOR")

export function getNavByRole(user?: User | null) {
  const links = staffNav(user)
  const isAdmin = user?.roles?.some((r) => r.name === "ADMIN")
  return !isAdmin && canViewAnalytics(user) ? [...links, analyticsLink] : links
}

function staffNav(user?: User | null) {
  if (!user) return healthStaffNavLinks

  const role = user.role ?? user.roles?.[0]?.name
  const position = user.adminPosition
  const modules = user.adminModules ?? []
  const isAdmin = user.roles?.some((r) => r.name === "ADMIN")

  if (isAdmin) {
    if (position === "SUPER_ADMIN") return adminNavLinks

    if (position === "ADMIN") {
      return adminNavLinks.filter((item: AdminNavItem) => !item.superAdminOnly)
    }

    // MODERATOR: dashboard + items in their module list
    return adminNavLinks.filter((item: AdminNavItem) => {
      if (item.superAdminOnly) return false
      if (item.slug === "/admin/dashboard") return true
      if (!item.module) return false
      return modules.includes(item.module)
    })
  }

  // Healthsight staff roles (NURSE, PHARMACIST, etc.)
  return roleNavMap[role] ?? healthStaffNavLinks
}
