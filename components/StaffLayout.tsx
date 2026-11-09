"use client"

import { useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useSessionUser, isAdmin } from "@/hooks/use-session-user"
import { ShellSkeleton } from "@/components/shell/ShellSkeleton"
import { AppTopBar } from "@/components/shell/AppTopBar"
import { MobileTabBar } from "@/components/shell/MobileTabBar"
import { CommandPaletteProvider } from "@/components/shell/CommandPalette"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useApiQuery } from "@/lib/queries"
import { useNavItems } from "@/lib/nav"

type MyPeriods = {
  open?: {
    totalQuestions?: number
    mySubmission?: { status: "IN_PROGRESS" | "SUBMITTED" } | null
    coverage?: { total: number; submitted: number }
  }[]
}

/** Open assessments this person still has to finish, for the menu badge. */
function useAssessmentsDue(enabled: boolean) {
  const { data } = useApiQuery<MyPeriods>(enabled ? "/assessment/my" : null, { silent: true })
  return (data?.open ?? []).filter(
    (p) =>
      p.coverage ? p.coverage.submitted < p.coverage.total : p.mySubmission?.status !== "SUBMITTED"
  ).length
}

export function StaffLayout({ children }: { children: React.ReactNode }) {
  const { user, ready, verified } = useSessionUser()
  const router = useRouter()
  const admin = ready && isAdmin(user)
  const nav = useNavItems()
  const due = useAssessmentsDue(ready && !admin && nav.some((n) => n.href === "/assessment"))
  const badges = useMemo(() => ({ "/assessment": due }), [due])

  // Admins have their own portal.
  useEffect(() => {
    if (admin && verified) router.replace("/admin/dashboard")
  }, [admin, verified, router])

  if (!ready || !user || admin) return <ShellSkeleton />

  return (
    <CommandPaletteProvider>
      <SidebarProvider>
        <AppSidebar badges={badges} />
        <SidebarInset>
          <AppTopBar />
          <main className="container flex flex-1 flex-col gap-4 py-6 pb-24 md:py-8 md:pb-8">
            {children}
          </main>
          <MobileTabBar badges={badges} />
        </SidebarInset>
      </SidebarProvider>
    </CommandPaletteProvider>
  )
}
