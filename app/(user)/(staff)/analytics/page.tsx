"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { PowerBiReport } from "@/components/PowerBiReport"
import { useAuth } from "@/store/useAuth"
import { canViewAnalytics } from "@/lib/getNavByRole"

export default function AnalyticsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const allowed = canViewAnalytics(user)

  // Directors only on the staff side; everyone else goes back to their dashboard.
  useEffect(() => {
    if (user && !allowed) router.replace("/dashboard")
  }, [user, allowed, router])

  if (!allowed) return null
  return <PowerBiReport />
}
