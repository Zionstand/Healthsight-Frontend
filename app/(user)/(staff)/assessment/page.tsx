"use client"

import Link from "next/link"
import { format } from "date-fns"
import {
  ClipboardList,
  Clock,
  ChevronRight,
  Eye,
} from "lucide-react"

import { PageHeader } from "@/components/PageHeader"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useApiQuery } from "@/lib/queries"
import { StatusBadge } from "@/components/StatusBadge"
import { EmptyState } from "@/components/list/ListKit"

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
  return <StatusBadge status="SAFECARE" label="SafeCare" tone="info" />
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
    <div className="space-y-4 rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{p.title}</h3>
            {isSafeCare && <SafeCareBadge />}
            {isComplete ? (
              <StatusBadge status="COMPLETED" label={cov ? "All PHCs done" : "Submitted"} />
            ) : notStarted ? (
              <StatusBadge status="NEW" label="Not started" tone="neutral" />
            ) : (
              <StatusBadge status="IN_PROGRESS" />
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
    <div className="space-y-2 rounded-xl border border-dashed bg-muted/30 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{p.title}</h3>
            {isSafeCare && <SafeCareBadge />}
            <StatusBadge status="SCHEDULED" label="Upcoming" />
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
    <div className="space-y-3 rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{p.title}</h3>
            {isSafeCare && <SafeCareBadge />}
            <StatusBadge status="COMPLETED" label="Submitted" />
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
    <div className="space-y-2 rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{p.title}</h3>
            {isSafeCare && <SafeCareBadge />}
            <StatusBadge status="MISSED" />
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
      <h2 className="text-sm font-medium text-muted-foreground">
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
        <PageHeader title="My assessments" />
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
        title="My assessments"
        description="Quality assessments for your role: what's open now, what's coming, and what you've done."
      />

      {isEmpty && (
        <EmptyState
          className="rounded-xl border border-dashed"
          icon={<ClipboardList />}
          title="No assessments yet"
          description="Assessments for your role appear here when an admin opens a period."
        />
      )}

      <Section title="Open now" empty={!data || data.open.length === 0}>
        {data?.open.map((p) => <OpenCard key={p.id} p={p} />)}
      </Section>

      <Section title="Coming up" empty={!data || data.upcoming.length === 0}>
        {data?.upcoming.map((p) => <UpcomingCard key={p.id} p={p} />)}
      </Section>

      <Section title="Past assessments" empty={past.length === 0}>
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
