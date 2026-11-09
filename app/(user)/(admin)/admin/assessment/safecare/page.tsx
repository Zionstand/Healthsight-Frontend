"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  ShieldCheck,
  BarChart3,
  Clock,
  Plus,
  ChevronDown,
  ChevronRight,
} from "lucide-react"

import { PageHeader } from "@/components/PageHeader"
import { StatCard } from "@/components/StatCard"
import { PeriodsTable } from "@/components/assessment/PeriodsTable"
import { useListParams } from "@/hooks/use-list-params"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import api from "@/lib/api"
import { useApiQuery, useInvalidate } from "@/lib/queries"
import { apiErrorMessage } from "@/lib/api-error"

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Quarter = "Q1" | "Q2" | "Q3" | "Q4"

type Period = {
  id: string
  title: string
  description: string | null
  type: string
  quarter: Quarter | null
  year: number | null
  status: "DRAFT" | "ACTIVE" | "CLOSED"
  startDate: string
  endDate: string
  _count: { questions: number; submissions: number }
  createdBy: { firstName: string; lastName: string }
}

type Category = {
  id: string
  name: string
  order: number
  questions: { id: string }[]
}

type Question = {
  id: string
  text: string
  order: number
  type: string
  category: Category
  roles: { role: { id: string; label: string } }[]
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────


const QUARTERS: Quarter[] = ["Q1", "Q2", "Q3", "Q4"]
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - 1 + i)

// ─── SCHEMA ───────────────────────────────────────────────────────────────────

const periodSchema = z.object({
  quarter: z.enum(["Q1", "Q2", "Q3", "Q4"]),
  year: z.number().min(2020).max(2100),
  description: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
})

type PeriodFormValues = z.infer<typeof periodSchema>

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function SafecareAdminPage() {
  const [{ tab }, setTabParams] = useListParams({ tab: "periods" })
  const SAFECARE = { type: "SAFECARE" }
  const invalidate = useInvalidate()
  const periodsQ = useApiQuery<Period[]>("/assessment/periods", {
    params: SAFECARE,
    errorMessage: "Failed to load SafeCare data",
  })
  const questionsQ = useApiQuery<Question[]>("/assessment/questions", { params: SAFECARE })
  const categoriesQ = useApiQuery<Category[]>("/assessment/categories", { params: SAFECARE })
  const periods = periodsQ.data ?? []
  const questions = questionsQ.data ?? []
  const categories = useMemo(
    () => [...(categoriesQ.data ?? [])].sort((a, b) => a.order - b.order),
    [categoriesQ.data]
  )
  const loading = periodsQ.isPending || questionsQ.isPending || categoriesQ.isPending
  const [pSheet, setPSheet] = useState<{ open: boolean; data?: Period }>({
    open: false,
  })
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    name: string
  } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchAll = () =>
    invalidate("/assessment/periods", "/assessment/questions", "/assessment/categories")

  async function updateStatus(id: string, status: string) {
    try {
      await api.patch(`/assessment/periods/${id}`, { status })
      toast.success("Status updated")
      fetchAll()
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update status"))
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/assessment/periods/${deleteTarget.id}`)
      toast.success("Period deleted")
      setDeleteTarget(null)
      fetchAll()
    } catch (err) {
      toast.error(apiErrorMessage(err, "Delete failed"))
    } finally {
      setDeleting(false)
    }
  }

  const active = periods.filter((p) => p.status === "ACTIVE")
  const draft = periods.filter((p) => p.status === "DRAFT")
  const totalSubmissions = periods.reduce((s, p) => s + p._count.submissions, 0)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-4 w-80" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="SafeCare assessment"
        description="Standards-based quality improvement assessment across 14 domains"
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <StatCard
          icon={<ShieldCheck className="h-5 w-5 text-brand-verdant-600" />}
          label="Active Periods"
          value={active.length}
          bg="bg-brand-verdant-50 dark:bg-brand-verdant-900/40"
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-muted-foreground" />}
          label="Draft Periods"
          value={draft.length}
          bg="bg-muted/50"
        />
        <StatCard
          icon={<BarChart3 className="h-5 w-5 text-brand-sky-600" />}
          label="Total Submissions"
          value={totalSubmissions}
          bg="bg-brand-sky-50 dark:bg-brand-sky-900/40"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTabParams({ tab: v })}>
        <TabsList>
          <TabsTrigger value="periods">
            Periods{" "}
            <Badge variant="secondary" className="ml-1.5">
              {periods.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="questions">
            Question Bank{" "}
            <Badge variant="secondary" className="ml-1.5">
              {questions.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* ── PERIODS ──────────────────────────────────────────────────────── */}
        <TabsContent value="periods" className="space-y-4 pt-4">
          <div className="flex justify-end">
            <Button onClick={() => setPSheet({ open: true })}>
              <Plus /> New period
            </Button>
          </div>
          <PeriodsTable
            periods={periods}
            resultsHref={(p) => `/admin/assessment/safecare/${p.id}`}
            onCreate={() => setPSheet({ open: true })}
            onEdit={(p) => setPSheet({ open: true, data: p })}
            onStatusChange={updateStatus}
            onDelete={(p) => setDeleteTarget({ id: p.id, name: p.title })}
            emptyDescription="SafeCare runs every two years. Create a period to open it to quality assurance officers."
          />
        </TabsContent>

        {/* ── QUESTION BANK (read-only) ─────────────────────────────────── */}
        <TabsContent value="questions" className="space-y-4 pt-4">
          <p className="text-sm text-muted-foreground">
            The SafeCare question bank contains {questions.length} indicators
            across {categories.length} domains. Questions are managed through
            the admin seed — contact your system administrator to update them.
          </p>
          <QuestionBankView categories={categories} questions={questions} />
        </TabsContent>
      </Tabs>

      <PeriodSheet
        open={pSheet.open}
        data={pSheet.data}
        onClose={() => setPSheet({ open: false })}
        onSaved={fetchAll}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this period?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> will be permanently deleted.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── QUESTION BANK VIEW ───────────────────────────────────────────────────────

function QuestionBankView({
  categories,
  questions,
}: {
  categories: Category[]
  questions: Question[]
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-2">
      {categories.map((cat) => {
        const catQs = questions
          .filter((q) => q.category.id === cat.id)
          .sort((a, b) => a.order - b.order)
        const isOpen = expanded.has(cat.id)
        return (
          <div key={cat.id} className="overflow-hidden rounded-lg border">
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50"
              onClick={() => toggle(cat.id)}
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0" />
              )}
              <span className="flex-1 text-sm font-medium">{cat.name}</span>
              <Badge variant="secondary" className="text-xs">
                {catQs.length} indicators
              </Badge>
            </button>
            {isOpen && (
              <div className="divide-y border-t">
                {catQs.map((q, idx) => (
                  <div
                    key={q.id}
                    className="flex items-start gap-3 bg-muted/20 px-4 py-2.5"
                  >
                    <span className="mt-0.5 w-5 shrink-0 text-xs text-muted-foreground">
                      {idx + 1}.
                    </span>
                    <p className="flex-1 text-sm leading-snug">{q.text}</p>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {q.type.replace(/_/g, " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── PERIOD SHEET ─────────────────────────────────────────────────────────────

function PeriodSheet({
  open,
  data,
  onClose,
  onSaved,
}: {
  open: boolean
  data?: Period
  onClose: () => void
  onSaved: () => void
}) {
  const form = useForm<PeriodFormValues>({
    resolver: zodResolver(periodSchema),
    defaultValues: {
      quarter: "Q1",
      year: CURRENT_YEAR,
      description: "",
      startDate: "",
      endDate: "",
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      quarter: (data?.quarter as Quarter) ?? "Q1",
      year: data?.year ?? CURRENT_YEAR,
      description: data?.description ?? "",
      startDate: data?.startDate ? data.startDate.slice(0, 10) : "",
      endDate: data?.endDate ? data.endDate.slice(0, 10) : "",
    })
  }, [open, data])

  async function onSubmit(values: PeriodFormValues) {
    const title = `${values.quarter} ${values.year} SafeCare Assessment`
    const payload = {
      ...values,
      title,
      type: "SAFECARE",
      startDate: new Date(values.startDate).toISOString(),
      endDate: new Date(values.endDate + "T23:59:59").toISOString(),
    }
    try {
      if (data) {
        await api.patch(`/assessment/periods/${data.id}`, payload)
        toast.success("Period updated")
      } else {
        await api.post("/assessment/periods", payload)
        toast.success("Period created — all SafeCare indicators included automatically")
      }
      onClose()
      onSaved()
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to save period"))
    }
  }

  const quarter = form.watch("quarter")
  const year = form.watch("year")

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full max-w-lg flex-col gap-0 sm:max-w-lg">
        <SheetHeader className="border-b pb-4">
          <SheetTitle>
            {data ? "Edit Period" : "New SafeCare Period"}
          </SheetTitle>
          {quarter && year && (
            <p className="text-sm text-muted-foreground">
              Will be titled:{" "}
              <strong>
                {quarter} {year} SafeCare Assessment
              </strong>
            </p>
          )}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <Form {...form}>
            <form className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quarter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quarter</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {QUARTERS.map((q) => (
                            <SelectItem key={q} value={q}>
                              {q}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year</FormLabel>
                      <Select
                        value={String(field.value)}
                        onValueChange={(v) => field.onChange(Number(v))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {YEARS.map((y) => (
                            <SelectItem key={y} value={String(y)}>
                              {y}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Description{" "}
                      <span className="text-muted-foreground">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief note about this assessment period..."
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                All {120} SafeCare indicators across 12 domains are included automatically.
              </p>
            </form>
          </Form>
        </div>
        <SheetFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Saving..." : "Save Period"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
