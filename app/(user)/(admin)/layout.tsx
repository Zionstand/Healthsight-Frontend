"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useSessionUser, isAdmin } from "@/hooks/use-session-user"
import { ShellSkeleton } from "@/components/shell/ShellSkeleton"
import { AdminSidebar } from "@/features/admin/components/AdminSidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppTopBar } from "@/components/shell/AppTopBar"
import { CommandPaletteProvider } from "@/components/shell/CommandPalette"
import { useApiQuery } from "@/lib/queries"
import { useDocumentTitle } from "@/hooks/use-document-title"

// One place to title every admin route (the admin layout is a client component,
// so per-page metadata exports aren't available here).
const ADMIN_TITLES: Record<string, string> = {
  "/admin/dashboard": "Admin Dashboard",
  "/admin/analytics": "Assessment Analysis",
  "/admin/users": "Staff",
  "/admin/pending-users": "Pending Approvals",
  "/admin/phcs": "PHCs",
  "/admin/phcs/map": "PHC Map",
  "/admin/roles": "Roles & Permissions",
  "/admin/sms": "SMS",
  "/admin/directors": "Directors",
  "/admin/assessment/general": "General Assessment",
  "/admin/assessment/safecare": "SafeCare Assessment",
}

function resolveAdminTitle(pathname: string): string {
  if (ADMIN_TITLES[pathname]) return ADMIN_TITLES[pathname]
  if (pathname.startsWith("/admin/users/")) return "User Profile"
  if (pathname.startsWith("/admin/assessment/")) return "Assessment Results"
  return "Admin Portal"
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, ready, verified } = useSessionUser()
  const router = useRouter()
  const pathname = usePathname()

  useDocumentTitle(resolveAdminTitle(pathname))

  const notAdmin = ready && !isAdmin(user)

  // Staff accounts belong in the staff app.
  useEffect(() => {
    if (notAdmin && verified) router.replace("/dashboard")
  }, [notAdmin, verified, router])

  // Pending sign-ups, for the menu badge (shares the dashboard's cached stats).
  const { data: stats } = useApiQuery<{ users: { pending: number } }>(
    ready && !notAdmin ? "/admin/stats" : null,
    { silent: true }
  )
  const pendingCount = stats?.users.pending ?? 0

  if (!ready || notAdmin) return <ShellSkeleton />

  return (
    <CommandPaletteProvider>
      <SidebarProvider>
        <AdminSidebar pendingCount={pendingCount} />
        <SidebarInset>
          <AppTopBar />
          <main className="@container/main container flex flex-1 flex-col gap-4 py-6 md:py-8">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </CommandPaletteProvider>
  )
}
