"use client"

import { useMemo } from "react"
import Link from "next/link"
import {
  Users,
  Building2,
  Clock,
  ShieldCheck,
  ClipboardList,
  BarChart3,
  CheckCircle2,
  UserRound,
  Stethoscope,
  TrendingUp,
  Download,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { downloadFile } from "@/lib/download"
import { useApiQuery } from "@/lib/queries"

type ScreeningByType = { type: string; count: number }

type Stats = {
  users: { total: number; active: number; pending: number }
  phcs: { total: number }
  assessment: {
    activePeriods: { id: string; title: string; type: string; submissions: number }[]
    totalSubmissions: number
  }
  clinical: {
    patients: { total: number; thisMonth: number }
    screenings: {
      total: number
      completed: number
      referred: number
      completionRate: number
      byType: ScreeningByType[]
    }
  }
}

type AdminUser = {
  id: string
  firstName: string
  lastName: string
  roles: { role: { label: string } }[]
  accountStatus: string
  createdAt: string
}

const SCREENING_LABELS: Record<string, string> = {
  HYPERTENSION: "Hypertension",
  DIABETES: "Diabetes",
  CERVICAL_CANCER: "Cervical Cancer",
  BREAST_CANCER: "Breast Cancer",
  PSA: "PSA",
}

function timeAgo(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  if (days < 1) return "Today"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}yr ago`
}

function isNew(dateStr: string) {
  return Date.now() - new Date(dateStr).getTime() < 7 * 24 * 60 * 60 * 1000
}

export default function AdminDashboardPage() {
  const { data: stats, isPending: statsLoading } = useApiQuery<Stats>("/admin/stats", {
    errorMessage: "Failed to load dashboard",
  })
  const { data: users, isPending: usersLoading } = useApiQuery<AdminUser[] | { data: AdminUser[] }>(
    "/admin/users"
  )
  const loading = statsLoading || usersLoading
  const recentUsers = useMemo(() => {
    const list = Array.isArray(users) ? users : (users?.data ?? [])
    return [...list]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6)
  }, [users])

  const summaryCards = [
    {
      label: "Active Staff",
      value: stats?.users.active ?? 0,
      sub: `${stats?.users.pending ?? 0} pending`,
      icon: Users,
      bg: "bg-brand-sky-600",
      fg: "text-white",
      href: "/admin/users",
    },
    {
      label: "Total PHCs",
      value: stats?.phcs.total ?? 0,
      sub: "facilities",
      icon: Building2,
      bg: "bg-brand-verdant-600",
      fg: "text-white",
      href: "/admin/phcs",
    },
    {
      label: "Pending Approvals",
      value: stats?.users.pending ?? 0,
      sub: "awaiting review",
      icon: Clock,
      bg: "bg-brand-amber-500",
      fg: "text-brand-charcoal-900",
      href: "/admin/pending-users",
    },
    {
      label: "Total Submissions",
      value: stats?.assessment.totalSubmissions ?? 0,
      sub: "all time",
      icon: ClipboardList,
      bg: "bg-brand-charcoal-700",
      fg: "text-white",
      href: "/admin/assessment/general",
    },
  ]

  const clinicalCards = [
    {
      label: "Total Patients",
      value: stats?.clinical.patients.total ?? 0,
      sub: `+${stats?.clinical.patients.thisMonth ?? 0} this month`,
      icon: UserRound,
      color: "text-brand-sky-600",
      bg: "bg-brand-sky-50 dark:bg-brand-sky-900/30",
    },
    {
      label: "Total Screenings",
      value: stats?.clinical.screenings.total ?? 0,
      sub: `${stats?.clinical.screenings.completed ?? 0} completed`,
      icon: Stethoscope,
      color: "text-brand-verdant-600",
      bg: "bg-brand-verdant-50 dark:bg-brand-verdant-900/30",
    },
    {
      label: "Completion Rate",
      value: `${stats?.clinical.screenings.completionRate ?? 0}%`,
      sub: `${stats?.clinical.screenings.referred ?? 0} referred`,
      icon: TrendingUp,
      color: "text-brand-amber-600",
      bg: "bg-brand-amber-50 dark:bg-brand-amber-900/30",
    },
  ]

  return (
    <div className="space-y-6">
      {/* ── STAFF STAT CARDS ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ label, value, sub, icon: Icon, bg, fg, href }) => (
          <Link key={label} href={href} className="group">
            <div className={`${bg} ${fg} flex items-center justify-between rounded-xl px-6 py-5 transition-opacity group-hover:opacity-90`}>
              <div>
                <p className="text-sm font-medium opacity-90">{label}</p>
                {loading ? (
                  <Skeleton className="mt-2 h-8 w-12 bg-white/30" />
                ) : (
                  <p className="mt-1 text-3xl font-bold">{value}</p>
                )}
                {!loading && <p className="mt-0.5 text-xs opacity-70">{sub}</p>}
              </div>
              <Icon className="size-10 opacity-80" strokeWidth={1.5} />
            </div>
          </Link>
        ))}
      </div>

      {/* ── CLINICAL STATS ───────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Clinical Overview</h2>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadFile("/patients/export/csv", "patients.csv")}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Patients CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadFile("/admin/export/screenings", "screenings.csv")}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Screenings CSV
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {clinicalCards.map(({ label, value, sub, icon: Icon, color, bg }) => (
            <div key={label} className={`rounded-lg border p-4 ${bg}`}>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{label}</p>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              {loading ? (
                <Skeleton className="mt-2 h-7 w-16" />
              ) : (
                <p className="mt-1 text-2xl font-bold">{value}</p>
              )}
              {!loading && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
            </div>
          ))}
        </div>

        {/* Screenings by type */}
        {!loading && (stats?.clinical.screenings.byType.length ?? 0) > 0 && (
          <div className="rounded-lg border p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Screenings by Type</p>
            <div className="space-y-2">
              {stats?.clinical.screenings.byType.map((s) => {
                const pct = stats.clinical.screenings.total > 0
                  ? Math.round((s.count / stats.clinical.screenings.total) * 100)
                  : 0
                return (
                  <div key={s.type} className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{SCREENING_LABELS[s.type] ?? s.type}</span>
                      <span className="font-medium">{s.count} ({pct}%)</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── ACTIVE ASSESSMENT PERIODS ────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Active Assessment Periods</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/assessment/general">View all</Link>
          </Button>
        </div>

        {loading && <Skeleton className="h-20 rounded-lg" />}

        {!loading && (stats?.assessment.activePeriods.length ?? 0) === 0 && (
          <div className="rounded-lg border border-dashed px-6 py-8 text-center text-sm text-muted-foreground">
            No active assessment periods
          </div>
        )}

        {!loading &&
          stats?.assessment.activePeriods?.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border bg-card px-5 py-4">
              <div className="flex items-center gap-3">
                {p.type === "SAFECARE" ? (
                  <ShieldCheck className="h-5 w-5 shrink-0 text-brand-sky-500" />
                ) : (
                  <BarChart3 className="h-5 w-5 shrink-0 text-primary" />
                )}
                <div>
                  <p className="text-sm font-medium">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.submissions} submission{p.submissions !== 1 ? "s" : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-brand-verdant-100 text-xs text-brand-verdant-700">ACTIVE</Badge>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/admin/assessment/${p.type === "SAFECARE" ? "safecare" : "general"}/${p.id}`}>
                    Results
                  </Link>
                </Button>
              </div>
            </div>
          ))}
      </div>

      {/* ── RECENT USERS + QUICK LINKS ───────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
        <Card className="gap-1 lg:col-span-3">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle>Recent Users</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/users">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between px-6 py-4">
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))
              : recentUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between px-6 py-4">
                    <div>
                      <p className="text-sm font-medium">{u.firstName} {u.lastName}</p>
                      <p className="text-xs text-muted-foreground">{u.roles.map((r) => r.role.label).join(", ")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {u.accountStatus === "PENDING" && (
                        <Badge className="bg-brand-amber-100 text-xs text-brand-amber-700">Pending</Badge>
                      )}
                      {isNew(u.createdAt) && u.accountStatus !== "PENDING" && (
                        <Badge className="bg-brand-sky-100 text-xs text-brand-sky-700">New</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{timeAgo(u.createdAt)}</span>
                    </div>
                  </div>
                ))}
          </CardContent>
        </Card>

        <Card className="gap-1 lg:col-span-2">
          <CardHeader className="border-b">
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {[
              { label: "Review pending users", href: "/admin/pending-users", icon: Clock, badge: stats?.users.pending },
              { label: "General Assessment", href: "/admin/assessment/general", icon: ClipboardList },
              { label: "SafeCare Assessment", href: "/admin/assessment/safecare", icon: ShieldCheck },
              { label: "PHC Map View", href: "/admin/phcs/map", icon: Building2 },
              { label: "Manage staff", href: "/admin/users", icon: Users },
            ].map(({ label, href, icon: Icon, badge }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between border-b px-6 py-4 text-sm transition-colors last:border-0 hover:bg-muted/50"
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {label}
                </span>
                {badge !== undefined && badge > 0 && (
                  <Badge className="bg-brand-amber-100 text-xs text-brand-amber-700">{badge}</Badge>
                )}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
