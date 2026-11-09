"use client"

import Link from "next/link"
import { format } from "date-fns"
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  ChevronRight,
  Calendar,
  XCircle,
  Eye,
  ShieldCheck,
} from "lucide-react"

import { PageHeader } from "@/components/PageHeader"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useApiQuery } from "@/lib/queries"

type Submission = {
  id: string
  answeredCount: number
  updatedAt: string
  editDeadline?: string
  daysLeft?: number
  answers?: any[]
}

type MyPeriod = {
  id: string
  title: string
  description?: string
  type: string
  quarter?: number
  year: number
  startDate: string
  endDate: string
  totalQuestions: number
  displayStatus: "OPEN" | "UPCOMING" | "CLOSED" | "MISSED"
  questions?: any[]
  mySubmission: Submission | null
  /** Directors: progress across the PHCs in their district. */
  coverage?: { total: number; started: number; complete: number }
}

type MyPeriods = {
  open: MyPeriod[]
  upcoming: MyPeriod[]
  closed: MyPeriod[]
  missed: MyPeriod[]
}

function SafeCareBadge() {
  return (
    <Badge className="bg-brand-sky-100 text-brand-sky-700 dark:bg-brand-sky-900 dark:text-brand-sky-300">
      <ShieldCheck className="mr-1 h-3 w-3" /> SafeCare
    </Badge>
  )
}

function EditWindowBadge({ daysLeft }: { daysLeft: number }) {
  if (daysLeft === 0)
    return (
      <span className="text-xs text-muted-foreground">Editing closed</span>
    )
  if (daysLeft <= 2)
    return (
      <span className="text-xs font-medium text-brand-amber-600 dark:text-brand-amber-400">
        {daysLeft} day{daysLeft !== 1 ? "s" : ""} left to edit
      </span>
    )
  return (
    <span className="text-xs text-muted-foreground">
      {daysLeft} days left to edit
    </span>
  )
}

function OpenCard({ p }: { p: MyPeriod }) {
  const sub = p.mySubmission
  const cov = p.coverage
  // Directors track PHCs across their district; everyone else, questions.
  const total = cov ? cov.total : p.totalQuestions
  const answered = cov ? cov.complete : (sub?.answeredCount ?? 0)
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0
  const isComplete = answered === total && total > 0
  const notStarted = cov ? cov.started === 0 : !sub
  const isSafeCare = p.type === "SAFECARE"

  return (
    <div className="space-y-4 rounded-lg border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{p.title}</h3>
            {isSafeCare && <SafeCareBadge />}
            {isComplete ? (
              <Badge className="bg-brand-verdant-100 text-brand-verdant-700 dark:bg-brand-verdant-900 dark:text-brand-verdant-300">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Submitted
              </Badge>
            ) : notStarted ? (
              <Badge variant="secondary">New</Badge>
            ) : (
              <Badge variant="outline">In Progress</Badge>
            )}
          </div>
          {p.description && (
            <p className="text-sm text-muted-foreground">{p.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Closes {format(new Date(p.endDate), "dd MMM yyyy, HH:mm")}
            </span>
            {isSafeCare && <span>Every 2 years</span>}
            {sub?.daysLeft !== undefined && (
              <EditWindowBadge daysLeft={sub.daysLeft} />
            )}
          </div>
        </div>
        <Button asChild size="sm" disabled={!cov && sub?.daysLeft === 0}>
          <Link href={`/assessment/${p.id}`}>
            {cov ? "Choose PHC" : isComplete ? "Review / Edit" : !sub ? "Start" : "Continue"}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {cov
              ? `${cov.complete} of ${cov.total} PHCs complete · ${cov.started} started`
              : `${answered} of ${total} questions answered`}
          </span>
          <span>{pct}%</span>
        </div>
        <Progress value={pct} className="h-2" />
      </div>
    </div>
  )
}

function UpcomingCard({ p }: { p: MyPeriod }) {
  const isSafeCare = p.type === "SAFECARE"
  return (
    <div className="space-y-2 rounded-lg border border-dashed bg-muted/30 p-5 opacity-70">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{p.title}</h3>
            {isSafeCare && <SafeCareBadge />}
            <Badge variant="outline" className="text-brand-sky-600 dark:text-brand-sky-400">
              <Calendar className="mr-1 h-3 w-3" /> Upcoming
            </Badge>
          </div>
          {p.description && (
            <p className="text-sm text-muted-foreground">{p.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Opens {format(new Date(p.startDate), "dd MMM yyyy")} &mdash; Closes{" "}
              {format(new Date(p.endDate), "dd MMM yyyy")}
            </span>
            {isSafeCare && <span>Every 2 years</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

function ClosedCard({ p }: { p: MyPeriod }) {
  const sub = p.mySubmission
  const cov = p.coverage
  const total = p.totalQuestions
  const answered = sub?.answeredCount ?? 0
  const isSafeCare = p.type === "SAFECARE"

  return (
    <div className="space-y-3 rounded-lg border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{p.title}</h3>
            {isSafeCare && <SafeCareBadge />}
            <Badge className="bg-brand-verdant-100 text-brand-verdant-700 dark:bg-brand-verdant-900 dark:text-brand-verdant-300">
              <CheckCircle2 className="mr-1 h-3 w-3" /> Submitted
            </Badge>
          </div>
          {p.description && (
            <p className="text-sm text-muted-foreground">{p.description}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {cov ? (
              <>
                Closed {format(new Date(p.endDate), "dd MMM yyyy")} &bull; {cov.started} of {cov.total} PHCs
                assessed
              </>
            ) : sub ? (
              <>
                Submitted {format(new Date(sub.updatedAt), "dd MMM yyyy, HH:mm")} &bull;{" "}
                {answered} of {total} answered
              </>
            ) : null}
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={`/assessment/${p.id}`}>
            <Eye className="mr-1 h-4 w-4" /> Review
          </Link>
        </Button>
      </div>
    </div>
  )
}

function MissedCard({ p }: { p: MyPeriod }) {
  const isSafeCare = p.type === "SAFECARE"
  return (
    <div className="space-y-2 rounded-lg border border-brand-crimson-200 bg-brand-crimson-50/40 p-5 dark:border-brand-crimson-900 dark:bg-brand-crimson-900/20">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{p.title}</h3>
            {isSafeCare && <SafeCareBadge />}
            <Badge variant="destructive" className="opacity-80">
              <XCircle className="mr-1 h-3 w-3" /> Missed
            </Badge>
          </div>
          {p.description && (
            <p className="text-sm text-muted-foreground">{p.description}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Closed {format(new Date(p.endDate), "dd MMM yyyy")} &bull;{" "}
            {p.totalQuestions} question{p.totalQuestions !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </div>
  )
}

function Section({
  title,
  children,
  empty,
}: {
  title: string
  children: React.ReactNode
  empty?: boolean
}) {
  if (empty) return null
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="grid gap-3">{children}</div>
    </div>
  )
}

export default function AssessmentListPage() {
  const { data, isPending: loading } = useApiQuery<MyPeriods>("/assessment/my", {
    errorMessage: "Failed to load assessments",
  })

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="My Assessments" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    )
  }

  const isEmpty =
    !data ||
    (data.open.length === 0 &&
      data.upcoming.length === 0 &&
      data.closed.length === 0 &&
      data.missed.length === 0)

  const past = [
    ...(data?.closed ?? []),
    ...(data?.missed ?? []),
  ].sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Assessments"
        description="Assessment periods assigned to your role"
      />

      {isEmpty && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <ClipboardList className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">No assessments yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Check back when an assessment period is open.
          </p>
        </div>
      )}

      <Section title="Open Now" empty={!data || data.open.length === 0}>
        {data?.open.map((p) => <OpenCard key={p.id} p={p} />)}
      </Section>

      <Section title="Coming Up" empty={!data || data.upcoming.length === 0}>
        {data?.upcoming.map((p) => <UpcomingCard key={p.id} p={p} />)}
      </Section>

      <Section title="Past Assessments" empty={past.length === 0}>
        {past.map((p) =>
          p.displayStatus === "CLOSED" ? (
            <ClosedCard key={p.id} p={p} />
          ) : (
            <MissedCard key={p.id} p={p} />
          ),
        )}
      </Section>
    </div>
  )
}
