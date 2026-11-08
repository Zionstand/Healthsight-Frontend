"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/store/useAuth"
import { AdminSidebar } from "@/features/admin/components/AdminSidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { ThemeSwitcher } from "@/components/ThemeSwitcher"
import { useDocumentTitle } from "@/hooks/use-document-title"

// One place to title every admin route (the admin layout is a client component,
// so per-page metadata exports aren't available here).
const ADMIN_TITLES: Record<string, string> = {
  "/admin/dashboard": "Admin Dashboard",
  "/admin/analytics": "Assessment Analysis",
  "/admin/users": "User Management",
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
  const { user, _hasHydrated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useDocumentTitle(resolveAdminTitle(pathname))

  useEffect(() => {
    if (!_hasHydrated) return
    if (!user) {
      router.replace("/")
      return
    }
    if (!user.roles?.some((r) => r.name === "ADMIN")) {
      router.replace("/")
    }
  }, [user, _hasHydrated, router])

  // Don't render until hydrated — prevents flash of content
  if (!_hasHydrated || !user || !user.roles?.some((r) => r.name === "ADMIN"))
    return null

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <span className="text-xs font-medium text-muted-foreground">
            Admin Portal
          </span>
          <div className="ml-auto">
            <ThemeSwitcher />
          </div>
        </header>
        <div className="@container/main container flex flex-1 flex-col gap-4 py-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
