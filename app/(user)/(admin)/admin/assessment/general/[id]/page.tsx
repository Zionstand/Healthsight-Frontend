"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  Building2,
  CheckCircle2,
  BarChart3,
  ClipboardList,
  User,
} from "lucide-react"

import { PageHeader } from "@/components/PageHeader"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import api from "@/lib/api"
import { useApiQuery } from "@/lib/queries"
import { apiErrorMessage } from "@/lib/api-error"
import { StatCard } from "@/components/StatCard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ListPagination,
  ListToolbar,
  SearchInput,
  SegmentedFilter,
  TableState,
} from "@/components/list/ListKit"
import { StatusBadge } from "@/components/StatusBadge"
import { useListParams, useSearchParam } from "@/hooks/use-list-params"
import { useDocumentTitle } from "@/hooks/use-document-title"

// ─── TYPES ────────────────────────────────────────────────────────────────────

type OptionStat = {
  value: string
  label: string
  count: number
  percentage: number
}

type QuestionStat = {
  id: string
  text: string
  order: number
  type: string
  category: { id: string; name: string }
  roles: { id: string; name: string; label: string }[]
  totalAnswers: number
  optionStats: OptionStat[]
  textResponses: { value: string; count: number }[] | null
  numberStats?: {
    count: number
    sum: number
    average: number | null
    min: number | null
    max: number | null
    skipped: number
  } | null
}

type SubmissionSummary = {
  id: string
  answeredCount: number
  totalQuestions: number
  updatedAt: string
  // The facility being assessed. A submission belongs to the PHC, not the
  // person — `user` is null where the recording staff account no longer exists.
  phc: { id: string; name: string; lga: { name: string } | null } | null
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    phc: { name: string } | null
    lga: { name: string } | null
    roles: { role: { label: string } }[]
  } | null
  /** Who created the submission; `user` is whoever saved it last. */
  startedBy?: { id: string; firstName: string; lastName: string } | null
  /** Drafts auto-save and aren't counted until someone submits them. */
  status: "IN_PROGRESS" | "SUBMITTED"
  submittedAt: string | null
  submittedBy?: { id: string; firstName: string; lastName: string } | null
}

type Results = {
  period: {
    id: string
    title: string
    description?: string
    type: string
    quarter: string | null
    year: number | null
    status: string
    startDate: string
    endDate: string
  }
  stats: {
    totalEligible: number
    totalSubmitted: number
    /** Drafts: started, not yet submitted. Not in any figure. */
    inProgress: number
    completionRate: number
    complianceScore: number | null
    categoryCompliance: { name: string; score: number }[] | null
  }
  questions: QuestionStat[]
  submissions: SubmissionSummary[]
}

function safecareColor(label: string) {
  if (label === "Fully Compliant")
    return "text-brand-verdant-700 dark:text-brand-verdant-400 font-medium"
  if (label === "Partially Compliant")
    return "text-brand-amber-600 dark:text-brand-amber-400 font-medium"
  if (label === "Not Compliant")
    return "text-brand-crimson-600 dark:text-brand-crimson-400 font-medium"
  if (label === "Not Applicable") return "text-muted-foreground"
  return ""
}

function safecareBarColor(label: string) {
  if (label === "Fully Compliant") return "[&>*]:bg-brand-verdant-500"
  if (label === "Partially Compliant") return "[&>*]:bg-brand-amber-400"
  if (label === "Not Compliant") return "[&>*]:bg-brand-crimson-500"
  return ""
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

const SUB_PAGE_SIZE = 25

export default function PeriodResultsPage() {
  const { id } = useParams<{ id: string }>()
  const { data: results = null, isPending: loading } = useApiQuery<Results>(
    `/assessment/periods/${id}/results`,
    { errorMessage: "Failed to load results" }
  )
  const [selectedUser, setSelectedUser] = useState<SubmissionSummary | null>(
    null
  )
  const [userDetail, setUserDetail] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [params, setParams] = useListParams({
    tab: "submissions",
    q: "",
    status: "all",
    page: 1,
  })
  const [search, setSearch] = useSearchParam(params.q, (q) => setParams({ q }))
  useDocumentTitle(results?.period.title)

  async function openUserDetail(sub: SubmissionSummary) {
    setSelectedUser(sub)
    setDetailLoading(true)
    try {
      const res = await api.get(
        `/assessment/periods/${id}/results/${sub.phc?.id ?? ""}`
      )
      setUserDetail(res.data)
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to load submission detail"))
    } finally {
      setDetailLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  if (!results) return null

  const { period, stats, questions, submissions } = results

  // Group questions by category
  const byCategory = questions.reduce<Record<string, QuestionStat[]>>(
    (acc, q) => {
      const key = q.category.id
      if (!acc[key]) acc[key] = []
      acc[key].push(q)
      return acc
    },
    {}
  )

  const term = params.q.trim().toLowerCase()
  const shownSubs = submissions
    .filter(
      (s) =>
        params.status === "all" ||
        (params.status === "submitted" ? s.status === "SUBMITTED" : s.status !== "SUBMITTED")
    )
    .filter(
      (s) =>
        !term ||
        [
          s.phc?.name,
          s.phc?.lga?.name,
          s.user?.firstName,
          s.user?.lastName,
          s.startedBy?.firstName,
          s.startedBy?.lastName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term)
    )
    .sort((a, b) => (a.phc?.name ?? "").localeCompare(b.phc?.name ?? ""))
  const totalPages = Math.max(1, Math.ceil(shownSubs.length / SUB_PAGE_SIZE))
  const page = Math.min(params.page, totalPages)
  const pageSubs = shownSubs.slice(
    (page - 1) * SUB_PAGE_SIZE,
    page * SUB_PAGE_SIZE
  )

  return (
    <div className="space-y-8">
      <PageHeader
        title={period.title}
        description={period.description}
        back
        fallbackHref={
          period.type === "SAFECARE"
            ? "/admin/assessment/safecare"
            : "/admin/assessment/general"
        }
        badges={[period.type, period.status]}
        action={
          <div className="text-sm text-muted-foreground">
            {format(new Date(period.startDate), "dd MMM yyyy")} –{" "}
            {format(new Date(period.endDate), "dd MMM yyyy")}
          </div>
        }
      />

      {/* ── STATS CARDS ─────────────────────────────────────────────────────── */}
      <div
        className={`grid grid-cols-1 gap-2 ${period.type === "SAFECARE" ? "md:grid-cols-4" : "md:grid-cols-3"}`}
      >
        <StatCard
          icon={<Building2 className="h-5 w-5 text-brand-sky-600" />}
          label="PHCs in scope"
          value={stats.totalEligible}
          bg="bg-brand-sky-50 dark:bg-brand-sky-900"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-brand-verdant-600" />}
          label="PHCs submitted"
          value={stats.totalSubmitted}
          bg="bg-brand-verdant-50 dark:bg-brand-verdant-900"
        />
        <div className="space-y-2 rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">
              Completion rate
            </span>
          </div>
          <p className="text-2xl font-bold">{stats.completionRate}%</p>
          <Progress value={stats.completionRate} className="h-2" />
          {stats.inProgress > 0 && (
            <p className="text-xs text-muted-foreground">
              {stats.inProgress} more in progress, not yet submitted
            </p>
          )}
        </div>
        {period.type === "SAFECARE" && stats.complianceScore !== null && (
          <div
            className={`space-y-2 rounded-lg border p-4 ${stats.complianceScore >= 75 ? "bg-brand-verdant-50 dark:bg-brand-verdant-900" : stats.complianceScore >= 50 ? "bg-brand-amber-50 dark:bg-brand-amber-900" : "bg-brand-crimson-50 dark:bg-brand-crimson-900"}`}
          >
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">
                SafeCare Compliance
              </span>
            </div>
            <p className="text-2xl font-bold">{stats.complianceScore}%</p>
            <Progress
              value={stats.complianceScore}
              className={`h-2 ${stats.complianceScore >= 75 ? "[&>*]:bg-brand-verdant-500" : stats.complianceScore >= 50 ? "[&>*]:bg-brand-amber-400" : "[&>*]:bg-brand-crimson-500"}`}
            />
          </div>
        )}
      </div>

      {/* ── SAFECARE CATEGORY COMPLIANCE ────────────────────────────────────── */}
      {period.type === "SAFECARE" &&
        stats.categoryCompliance &&
        stats.categoryCompliance.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h2 className="text-base font-medium">Compliance by domain</h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {stats.categoryCompliance.map((cat) => (
                  <div
                    key={cat.name}
                    className="space-y-2 rounded-lg border p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm leading-tight font-medium">
                        {cat.name}
                      </p>
                      <span
                        className={`shrink-0 text-sm font-bold ${cat.score >= 75 ? "text-brand-verdant-600" : cat.score >= 50 ? "text-brand-amber-600" : "text-brand-crimson-600"}`}
                      >
                        {cat.score}%
                      </span>
                    </div>
                    <Progress
                      value={cat.score}
                      className={`h-1.5 ${cat.score >= 75 ? "[&>*]:bg-brand-verdant-500" : cat.score >= 50 ? "[&>*]:bg-brand-amber-400" : "[&>*]:bg-brand-crimson-500"}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      <Tabs value={params.tab} onValueChange={(v) => setParams({ tab: v })}>
        <TabsList>
          <TabsTrigger value="submissions">
            Submissions{" "}
            <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">
              {submissions.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="questions">
            Question breakdown{" "}
            <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">
              {questions.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* ── SUBMISSIONS ──────────────────────────────────────────────────── */}
        <TabsContent value="submissions" className="space-y-4 pt-4">
          <ListToolbar className="sm:justify-between">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by PHC, LGA or staff name"
            />
            <SegmentedFilter
              label="Status"
              value={params.status}
              onChange={(v) => setParams({ status: v, page: 1 })}
              options={[
                { value: "all", label: "All", count: submissions.length },
                { value: "submitted", label: "Submitted", count: stats.totalSubmitted },
                { value: "in-progress", label: "In progress", count: stats.inProgress },
              ]}
            />
          </ListToolbar>
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PHC</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Recorded by
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Last updated
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableState
                  loading={false}
                  empty={shownSubs.length === 0}
                  columns={4}
                  icon={<ClipboardList />}
                  title={
                    term
                      ? "No submissions match your search"
                      : "No submissions yet"
                  }
                  description={
                    term
                      ? "Try a different PHC, LGA or name."
                      : "PHCs appear here as soon as staff start filling in this assessment."
                  }
                  action={
                    term ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSearch("")}
                      >
                        Clear search
                      </Button>
                    ) : undefined
                  }
                />
                {pageSubs.map((s) => {
                  const pct = Math.round(
                    (s.answeredCount / Math.max(s.totalQuestions, 1)) * 100
                  )
                  const recorder = s.user
                    ? `${s.user.firstName} ${s.user.lastName}`
                    : "Staff account removed"
                  return (
                    <TableRow
                      key={s.id}
                      tabIndex={0}
                      className="cursor-pointer focus-visible:bg-muted/60 focus-visible:outline-none"
                      onClick={() => openUserDetail(s)}
                      onKeyDown={(e) => e.key === "Enter" && openUserDetail(s)}
                    >
                      <TableCell className="min-w-0 whitespace-normal break-words">
                        <p className="font-medium">
                          {s.phc?.name ?? s.user?.phc?.name ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {s.phc?.lga?.name}
                        </p>
                        <p className="text-xs text-muted-foreground md:hidden">
                          {recorder}
                        </p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <p
                          className={
                            s.user
                              ? undefined
                              : "text-sm text-muted-foreground italic"
                          }
                        >
                          {recorder}
                        </p>
                        {s.user && (
                          <p className="text-xs text-muted-foreground">
                            {s.user.roles.map((r) => r.role.label).join(", ")}
                          </p>
                        )}
                        {s.startedBy && s.startedBy.id !== s.user?.id && (
                          <p className="text-xs text-muted-foreground">
                            Started by {s.startedBy.firstName}{" "}
                            {s.startedBy.lastName}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="w-28 space-y-1.5 sm:w-36">
                          {s.status === "SUBMITTED" ? (
                            <StatusBadge status="COMPLETED" label="Submitted" />
                          ) : (
                            <StatusBadge status="IN_PROGRESS" label="In progress" />
                          )}
                          <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                            <span>
                              {s.answeredCount}/{s.totalQuestions}
                            </span>
                            <span>{pct}%</span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-sm whitespace-nowrap text-muted-foreground sm:table-cell">
                        {format(new Date(s.updatedAt), "dd MMM yyyy, HH:mm")}
                        {s.submittedAt && (
                          <p className="text-xs">
                            Submitted {format(new Date(s.submittedAt), "dd MMM yyyy")}
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <ListPagination
            page={page}
            totalPages={totalPages}
            total={shownSubs.length}
            pageSize={SUB_PAGE_SIZE}
            onPageChange={(p) => setParams({ page: p })}
            noun="submission"
          />
        </TabsContent>

        {/* ── PER-QUESTION BREAKDOWN ──────────────────────────────────────── */}
        <TabsContent value="questions" className="space-y-6 pt-4">
          <p className="text-sm text-muted-foreground">
            Figures come from the {stats.totalSubmitted.toLocaleString()} submitted assessment
            {stats.totalSubmitted === 1 ? "" : "s"}
            {stats.inProgress > 0
              ? `. ${stats.inProgress} still in progress ${stats.inProgress === 1 ? "is" : "are"} not included.`
              : "."}
          </p>
          {Object.entries(byCategory).map(([catId, qs]) => (
            <div key={catId} className="space-y-4">
              <h3 className="inline-block rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">
                {qs[0].category.name}
              </h3>
              {qs.map((q, idx) => (
                <div key={q.id} className="space-y-3 rounded-lg border p-4">
                  <p className="text-sm font-medium">
                    <span className="mr-2 text-muted-foreground">
                      {idx + 1}.
                    </span>
                    {q.text}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {q.totalAnswers} response(s)
                  </p>
                  <div className="space-y-2">
                    {q.numberStats && q.numberStats.count > 0 && (
                      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[
                          ["Total", q.numberStats.sum],
                          ["Average", q.numberStats.average],
                          ["Lowest", q.numberStats.min],
                          ["Highest", q.numberStats.max],
                        ].map(([label, v]) => (
                          <div key={label as string} className="rounded-md bg-muted/40 px-3 py-2">
                            <dt className="text-xs text-muted-foreground">{label}</dt>
                            <dd className="text-sm font-semibold tabular-nums">
                              {v === null ? "—" : Number(v).toLocaleString()}
                            </dd>
                          </div>
                        ))}
                        {q.numberStats.skipped > 0 && (
                          <p className="col-span-full text-xs text-muted-foreground">
                            {q.numberStats.skipped} answer{q.numberStats.skipped === 1 ? " isn't a number" : "s aren't numbers"} and{" "}
                            {q.numberStats.skipped === 1 ? "is" : "are"} left out of these figures.
                          </p>
                        )}
                      </dl>
                    )}
                    {q.type === "TEXT_INPUT" || q.type === "NUMBER" ? (
                      q.textResponses && q.textResponses.length > 0 ? (
                        <div className="space-y-1.5">
                          {q.textResponses.slice(0, 8).map((r) => (
                            <div
                              key={r.value}
                              className="flex items-start justify-between gap-4 rounded-md bg-muted/40 px-3 py-2 text-xs"
                            >
                              <span className="flex-1 text-foreground">
                                {r.value}
                              </span>
                              {r.count > 1 && (
                                <span className="shrink-0 text-muted-foreground">
                                  ×{r.count}
                                </span>
                              )}
                            </div>
                          ))}
                          {q.textResponses.length > 8 && (
                            <p className="pl-1 text-xs text-muted-foreground">
                              +{q.textResponses.length - 8} more unique
                              responses
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No responses yet
                        </p>
                      )
                    ) : (
                      q.optionStats.map((opt) => (
                        <div key={opt.value} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className={safecareColor(opt.label)}>
                              {opt.label}
                            </span>
                            <span className="text-muted-foreground">
                              {opt.count} ({opt.percentage}%)
                            </span>
                          </div>
                          <Progress
                            value={opt.percentage}
                            className={`h-1.5 ${safecareBarColor(opt.label)}`}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </TabsContent>
      </Tabs>

      {/* ── USER DETAIL DIALOG ───────────────────────────────────────────────── */}
      <Dialog
        open={!!selectedUser}
        onOpenChange={(o) => {
          if (!o) {
            setSelectedUser(null)
            setUserDetail(null)
          }
        }}
      >
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.phc?.name ?? "Facility"} &mdash;{" "}
              {selectedUser?.startedBy &&
              selectedUser.startedBy.id !== selectedUser.user?.id
                ? `started by ${selectedUser.startedBy.firstName} ${selectedUser.startedBy.lastName}, last saved by ${
                    selectedUser.user
                      ? `${selectedUser.user.firstName} ${selectedUser.user.lastName}`
                      : "a removed staff account"
                  }`
                : selectedUser?.user
                  ? `recorded by ${selectedUser.user.firstName} ${selectedUser.user.lastName}`
                  : "staff account removed"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {selectedUser?.submittedAt
                ? `Submitted ${format(new Date(selectedUser.submittedAt), "dd MMM yyyy, HH:mm")}${
                    selectedUser.submittedBy
                      ? ` by ${selectedUser.submittedBy.firstName} ${selectedUser.submittedBy.lastName}`
                      : ""
                  }`
                : "In progress: not submitted yet, so not counted in the results."}
            </p>
          </DialogHeader>
          {detailLoading && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          )}
          {userDetail && !detailLoading && (
            <div className="space-y-4">
              {userDetail.answers.map((a: any) => (
                <div key={a.id} className="space-y-1.5 rounded-md border p-3">
                  <p className="text-sm font-medium">{a.question.text}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {a.selectedOptions.map((v: string) => {
                      const label =
                        a.question.type === "YES_NO_NA"
                          ? v === "NOT_APPLICABLE"
                            ? "Not Applicable"
                            : v.charAt(0) + v.slice(1).toLowerCase()
                          : (a.question.options.find((o: any) => o.id === v)
                              ?.text ?? v)
                      return (
                        <Badge key={v} variant="secondary">
                          {label}
                        </Badge>
                      )
                    })}
                    {a.selectedOptions.length === 0 && (
                      <span className="text-xs text-muted-foreground">
                        No answer
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
