"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { format, isPast } from "date-fns"
import { CheckCircle2, Clock, History, Loader2, MapPin, Save } from "lucide-react"

import { PageHeader } from "@/components/PageHeader"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import api from "@/lib/api"
import { useInvalidate } from "@/lib/queries"
import { apiErrorMessage } from "@/lib/api-error"
import { useAuth } from "@/store/useAuth"
import { FacilityPicker } from "./FacilityPicker"

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Option = { id: string; text: string; order: number }
type Category = { id: string; name: string; order: number }
type Question = {
  id: string
  text: string
  order: number
  type: "YES_NO_NA" | "SINGLE_SELECT" | "MULTI_SELECT" | "TEXT_INPUT"
  category: Category
  options: Option[]
}

type Facility = {
  id: string
  name: string
  lga: { id: string; name: string }
  district: { id: string; name: string }
}

type Period = {
  id: string
  title: string
  description?: string
  endDate: string
  questions: Question[]
  /** Directors choose which PHC in their district they are assessing. */
  choosesFacility?: boolean
  facility?: Facility | null
  mySubmission: {
    id: string
    answeredCount: number
    createdAt: string
    updatedAt: string
    daysLeft: number
    lastSavedBy: { id: string; firstName: string; lastName: string } | null
    answers: { questionId: string; selectedOptions: string[] }[]
  } | null
}

type AnswersMap = Record<string, string[]>

const YES_NO_OPTIONS = [
  { value: "YES", label: "Yes" },
  { value: "NO", label: "No" },
  { value: "NOT_APPLICABLE", label: "Not Applicable" },
]

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function AssessmentFormPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const phcParam = searchParams.get("phc") ?? ""
  const me = useAuth((st) => st.user)

  const invalidate = useInvalidate()
  const [period, setPeriod] = useState<Period | null>(null)
  const [answers, setAnswers] = useState<AnswersMap>({})
  const [activeCatId, setActiveCatId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "pending" | "saving" | "saved" | "error"
  >("idle")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({})
  // Questions changed in this sitting. Only these are sent on save, so two
  // people working on the same PHC never overwrite each other's other answers.
  const dirtyRef = useRef<Set<string>>(new Set())
  const answersRef = useRef<AnswersMap>({})
  const [pickerOpen, setPickerOpen] = useState(false)
  const [switching, setSwitching] = useState(false)

  // One draft per period per facility.
  const draftKey = `hs_assessment_draft_${id}${phcParam ? `_${phcParam}` : ""}`

  useEffect(() => {
    async function load() {
      try {
        // One call for this period only. The /assessment/my list intentionally
        // omits question bodies, so it cannot be used to load the form.
        setLoading(true)
        dirtyRef.current = new Set()
        const detail = await api
          .get(`/assessment/periods/${id}/my`, {
            params: phcParam ? { phcId: phcParam } : undefined,
          })
          .then((r) => r.data as Period)
          .catch((err) => {
            // A director naming a PHC outside their district, for instance.
            if (phcParam) toast.error(apiErrorMessage(err, "Couldn't open that health centre"))
            return null
          })

        const periodRes = detail
        const submissionRes = { data: detail?.mySubmission ?? null }

        if (!periodRes) {
          if (phcParam) {
            router.replace(`/assessment/${id}`)
            return
          }
          toast.error("Assessment not found or not accessible")
          router.push("/assessment")
          return
        }

        setPeriod(periodRes)
        // Directors pick the PHC first.
        if (periodRes.choosesFacility && !periodRes.facility) setPickerOpen(true)
        setActiveCatId(getCategories(periodRes.questions)[0]?.id ?? "")

        const existingAnswers = submissionRes.data?.answers ?? []
        const map: AnswersMap = {}
        for (const a of existingAnswers) {
          map[a.questionId] = a.selectedOptions
        }

        // Nothing to answer until a director has chosen the PHC.
        if (periodRes.choosesFacility && !periodRes.facility) {
          answersRef.current = {}
          setAnswers({})
          return
        }

        // Restore from localStorage draft if server has no submission
        if (Object.keys(map).length === 0) {
          try {
            const draft = localStorage.getItem(draftKey)
            if (draft) {
              const parsed = JSON.parse(draft) as AnswersMap
              if (Object.keys(parsed).length > 0) {
                Object.assign(map, parsed)
                // Unsaved, so it goes up with the next save.
                Object.keys(parsed).forEach((q) => dirtyRef.current.add(q))
                toast.info("Resumed from your unsaved draft.")
              }
            }
          } catch {}
        } else {
          // Server has data, clear any stale localStorage draft
          try {
            localStorage.removeItem(draftKey)
          } catch {}
        }

        answersRef.current = map
        setAnswers(map)
      } catch (err) {
        toast.error(apiErrorMessage(err, "Failed to load assessment"))
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, phcParam])

  // Auto-highlight active category as user scrolls
  useEffect(() => {
    if (!period) return

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the topmost intersecting section
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) {
          setActiveCatId(visible[0].target.getAttribute("data-cat-id") ?? "")
        }
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 }
    )

    Object.values(categoryRefs.current).forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [period])

  function getCategories(questions: Question[]): Category[] {
    const seen = new Set<string>()
    return questions
      .map((q) => q.category)
      .filter((c) => {
        if (seen.has(c.id)) return false
        seen.add(c.id)
        return true
      })
      .sort((a, b) => a.order - b.order)
  }

  function getQuestionsInCategory(catId: string): Question[] {
    return (period?.questions ?? [])
      .filter((q) => q.category.id === catId)
      .sort((a, b) => a.order - b.order)
  }

  function answeredInCategory(catId: string): number {
    return getQuestionsInCategory(catId).filter(
      (q) => (answers[q.id] ?? []).length > 0
    ).length
  }

  function totalAnswered(): number {
    return Object.values(answers).filter((v) => v.length > 0).length
  }

  // Warn before leaving if there are unsaved changes
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (saveStatus === "pending" || saveStatus === "saving") {
        e.preventDefault()
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [saveStatus])

  function setAnswer(questionId: string, value: string[]) {
    const next = { ...answersRef.current, [questionId]: value }
    answersRef.current = next
    dirtyRef.current.add(questionId)
    setAnswers(next)
    try {
      localStorage.setItem(draftKey, JSON.stringify(next))
    } catch {}
    setSaveStatus("pending")

    // Clear any existing debounce timer
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)

    // Auto-save 2 seconds after the last change
    debounceRef.current = setTimeout(() => {
      doSave()
    }, 2000)
  }

  function scrollToCategory(catId: string) {
    setActiveCatId(catId)
    categoryRefs.current[catId]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }

  async function doSave(): Promise<boolean> {
    if (!period) return false
    const current = answersRef.current
    const sent = [...dirtyRef.current].map((questionId) => ({
      questionId,
      selectedOptions: current[questionId] ?? [],
    }))
    if (sent.length === 0) {
      setSaveStatus("saved")
      savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 3000)
      return true
    }
    const payload = {
      ...(period.facility ? { phcId: period.facility.id } : {}),
      answers: sent,
    }
    setSaveStatus("saving")
    try {
      await api.post(`/assessment/periods/${id}/submit`, payload)
      // Clear what went up, unless it was changed again while saving.
      for (const a of sent) {
        if ((answersRef.current[a.questionId] ?? []) === a.selectedOptions) {
          dirtyRef.current.delete(a.questionId)
        }
      }
      setSaveStatus(dirtyRef.current.size ? "pending" : "saved")
      // Lists, dashboards and admin results now reflect the new answers.
      void invalidate(
        "/assessment/my",
        `/assessment/periods/${id}/results`,
        `/assessment/periods/${id}/facilities`,
        "/admin/stats"
      )
      if (dirtyRef.current.size === 0) {
        try {
          localStorage.removeItem(draftKey)
        } catch {}
        // Reset to idle after 3 seconds
        savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 3000)
      }
      return true
    } catch (err) {
      setSaveStatus("error")
      toast.error(apiErrorMessage(err, "Failed to save answers"))
      return false
    }
  }

  /** Directors: save anything pending, then open the chosen PHC. */
  async function chooseFacility(phcId: string) {
    if (phcId === period?.facility?.id) {
      setPickerOpen(false)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (dirtyRef.current.size > 0) {
      setSwitching(true)
      const ok = await doSave()
      setSwitching(false)
      if (!ok) return
    }
    setPickerOpen(false)
    router.replace(`/assessment/${id}?phc=${phcId}`)
  }

  function handleSave() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    doSave()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="flex gap-6">
          <div className="hidden w-56 shrink-0 space-y-2 md:block">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
          <div className="flex-1 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Still transitioning (redirect in progress or loading race)
  if (!period) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="flex gap-6">
          <div className="hidden w-56 shrink-0 space-y-2 md:block">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
          <div className="flex-1 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const picker = period.choosesFacility ? (
    <FacilityPicker
      periodId={id}
      open={pickerOpen}
      onOpenChange={(o) => {
        setPickerOpen(o)
        // Closing without a PHC leaves nothing to show here.
        if (!o && !period.facility) router.push("/assessment")
      }}
      current={period.facility ? { id: period.facility.id, lgaId: period.facility.lga.id } : null}
      onChoose={chooseFacility}
      choosing={switching}
    />
  ) : null

  if (period.choosesFacility && !period.facility) {
    return (
      <div className="space-y-6">
        <PageHeader title={period.title} description={period.description} back fallbackHref="/assessment" />
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <MapPin className="size-8 text-muted-foreground" />
          <div>
            <p className="font-medium">Choose the health centre you are assessing</p>
            <p className="text-sm text-muted-foreground">
              Pick the district, local government and PHC to begin.
            </p>
          </div>
          <Button onClick={() => setPickerOpen(true)}>Choose PHC</Button>
        </div>
        {picker}
      </div>
    )
  }

  const categories = getCategories(period.questions)
  const total = period.questions.length
  const answered = totalAnswered()
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0
  const periodClosed = isPast(new Date(period.endDate))
  const editingClosed = !periodClosed && period.mySubmission?.daysLeft === 0
  const closed = periodClosed || editingClosed
  const sub = period.mySubmission
  const byOther = !!sub?.lastSavedBy && sub.lastSavedBy.id !== me?.id

  // Global question numbering
  const globalNumbers: Record<string, number> = {}
  let counter = 1
  for (const cat of categories) {
    for (const q of getQuestionsInCategory(cat.id)) {
      globalNumbers[q.id] = counter++
    }
  }

  return (
    <div className="space-y-6">
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <PageHeader
        title={period.title}
        description={period.description}
        back
        fallbackHref="/assessment"
        action={
          <div className="flex items-center gap-3">
            {/* Auto-save status indicator */}
            {saveStatus === "pending" && (
              <span className="text-xs text-muted-foreground">
                Unsaved changes
              </span>
            )}
            {saveStatus === "saving" && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving…
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="flex items-center gap-1.5 text-xs text-brand-verdant-600">
                <CheckCircle2 className="h-3 w-3" />
                All saved
              </span>
            )}
            {saveStatus === "error" && (
              <span className="text-xs text-destructive">Save failed</span>
            )}

            {!closed && (
              <Button
                onClick={handleSave}
                disabled={saveStatus === "saving"}
                variant={saveStatus === "saved" ? "outline" : "default"}
              >
                <Save className="mr-2 h-4 w-4" />
                {saveStatus === "saving" ? "Saving…" : "Save"}
              </Button>
            )}
          </div>
        }
      />

      {period.facility && (
        <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
            <div>
              <p className="font-medium">{period.facility.name}</p>
              <p className="text-xs text-muted-foreground">
                {period.facility.lga.name} · {period.facility.district.name}
              </p>
            </div>
          </div>
          {period.choosesFacility && (
            <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
              Change PHC
            </Button>
          )}
        </div>
      )}

      {period.choosesFacility && sub && (
        <div className="flex gap-3 rounded-lg border border-brand-sky-200 bg-brand-sky-50 p-3 text-sm text-brand-sky-900 dark:border-brand-sky-900 dark:bg-brand-sky-900/20 dark:text-brand-sky-200">
          <History className="mt-0.5 size-4 shrink-0" />
          <p>
            Started {format(new Date(sub.createdAt), "dd MMM yyyy")}
            {sub.lastSavedBy &&
              `, last saved by ${byOther ? `${sub.lastSavedBy.firstName} ${sub.lastSavedBy.lastName}` : "you"}`}{" "}
            on {format(new Date(sub.updatedAt), "dd MMM yyyy, HH:mm")}.{" "}
            {!byOther
              ? "Your answers are shown below."
              : closed
                ? "Their answers are shown below."
                : "Their answers are shown below. Anything you change is added to this same assessment, so nothing is submitted twice."}
          </p>
        </div>
      )}

      {closed && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {editingClosed
            ? "The 7-day editing window for this assessment has closed. It is now read-only."
            : "This assessment period has closed. The assessment is now read-only."}
        </div>
      )}

      {/* ── OVERALL PROGRESS ──────────────────────────────────────────────── */}
      <div className="space-y-2 rounded-lg border p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Overall Progress</span>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              {answered}/{total} answered
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Closes {format(new Date(period.endDate), "dd MMM yyyy, HH:mm")}
            </span>
          </div>
        </div>
        <Progress value={pct} className="h-2" />
      </div>

      {/* ── MOBILE: horizontal scrollable tabs ────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
        {categories.map((cat, idx) => {
          const catTotal = getQuestionsInCategory(cat.id).length
          const catAnswered = answeredInCategory(cat.id)
          const catComplete = catAnswered === catTotal && catTotal > 0
          const isActive = activeCatId === cat.id

          return (
            <button
              key={cat.id}
              onClick={() => scrollToCategory(cat.id)}
              className={`flex shrink-0 flex-col items-center gap-1 rounded-lg border px-3 py-2 text-center transition-colors ${
                isActive
                  ? "border-primary/25 bg-primary/8 text-primary"
                  : "border-border bg-card hover:bg-muted"
              }`}
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  catComplete
                    ? "bg-brand-verdant-500 text-white"
                    : isActive
                      ? "bg-primary/15 text-primary"
                      : "bg-muted-foreground/10 text-muted-foreground"
                }`}
              >
                {catComplete ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
              </div>
              <span className="max-w-[72px] truncate text-xs leading-tight">
                {cat.name}
              </span>
              <span
                className={`text-xs ${isActive ? "text-primary/60" : "text-muted-foreground"}`}
              >
                {catAnswered}/{catTotal}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── DESKTOP: sidebar + questions ──────────────────────────────────── */}
      <div className="flex gap-8">
        {/* Sticky sidebar — desktop only */}
        <aside className="hidden w-56 shrink-0 md:block">
          <div className="sticky top-6 max-h-[calc(100vh-8rem)] space-y-1 overflow-y-auto pr-1">
            {categories.map((cat, idx) => {
              const catTotal = getQuestionsInCategory(cat.id).length
              const catAnswered = answeredInCategory(cat.id)
              const catComplete = catAnswered === catTotal && catTotal > 0
              const isActive = activeCatId === cat.id
              const catPct =
                catTotal > 0 ? Math.round((catAnswered / catTotal) * 100) : 0

              return (
                <button
                  key={cat.id}
                  onClick={() => scrollToCategory(cat.id)}
                  className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    isActive
                      ? "border-primary/25 bg-primary/8 text-primary"
                      : "border-transparent hover:border-border hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        catComplete
                          ? "bg-brand-verdant-500 text-white"
                          : isActive
                            ? "bg-primary/15 text-primary"
                            : "bg-muted-foreground/10 text-muted-foreground"
                      }`}
                    >
                      {catComplete ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span className="flex-1 truncate text-sm leading-snug font-medium">
                      {cat.name}
                    </span>
                  </div>

                  {/* Mini progress bar */}
                  <div className="mt-2 space-y-0.5">
                    <div
                      className={`flex justify-between text-xs ${
                        isActive ? "text-primary/60" : "text-muted-foreground"
                      }`}
                    >
                      <span>
                        {catAnswered}/{catTotal}
                      </span>
                      <span>{catPct}%</span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-muted">
                      <div
                        className={`h-1 rounded-full transition-all ${
                          catComplete ? "bg-brand-verdant-500" : "bg-primary"
                        }`}
                        style={{ width: `${catPct}%` }}
                      />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        {/* Questions */}
        <div className="min-w-0 flex-1 space-y-10">
          {categories.map((cat) => {
            const catQuestions = getQuestionsInCategory(cat.id)
            return (
              <div
                key={cat.id}
                ref={(el) => {
                  categoryRefs.current[cat.id] = el
                }}
                data-cat-id={cat.id}
                className="scroll-mt-6 space-y-4"
              >
                <div className="rounded-md bg-primary px-4 py-2">
                  <h2 className="font-semibold text-primary-foreground">
                    {cat.name}
                  </h2>
                </div>

                {catQuestions.map((q) => (
                  <QuestionItem
                    key={q.id}
                    question={q}
                    number={globalNumbers[q.id]}
                    value={answers[q.id] ?? []}
                    onChange={(val) => setAnswer(q.id, val)}
                    disabled={closed}
                  />
                ))}
              </div>
            )
          })}

          {/* Bottom save button */}
          {!closed && (
            <div className="flex items-center justify-end gap-3 pb-4">
              {saveStatus === "saved" && (
                <span className="flex items-center gap-1.5 text-xs text-brand-verdant-600">
                  <CheckCircle2 className="h-3 w-3" />
                  All saved
                </span>
              )}
              {saveStatus === "pending" && (
                <span className="text-xs text-muted-foreground">
                  Unsaved changes
                </span>
              )}
              <Button
                size="lg"
                onClick={handleSave}
                disabled={saveStatus === "saving"}
                variant={saveStatus === "saved" ? "outline" : "default"}
                className="shadow-md"
              >
                {saveStatus === "saving" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {saveStatus === "saving"
                  ? "Saving…"
                  : `Save (${answered}/${total} answered)`}
              </Button>
            </div>
          )}
        </div>
      </div>
      {picker}
    </div>
  )
}

// ─── QUESTION ITEM ────────────────────────────────────────────────────────────

function QuestionItem({
  question,
  number,
  value,
  onChange,
  disabled,
}: {
  question: Question
  number: number
  value: string[]
  onChange: (val: string[]) => void
  disabled: boolean
}) {
  const answered = value.length > 0

  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        answered
          ? "border-brand-verdant-300 bg-brand-verdant-50/30 dark:border-brand-verdant-800 dark:bg-brand-verdant-900/20"
          : ""
      }`}
    >
      <p className="mb-3 text-sm font-medium">
        <span className="mr-2 font-bold text-primary">{number}.</span>
        {question.text}
      </p>

      {question.type === "YES_NO_NA" && (
        <RadioGroup
          value={value[0] ?? ""}
          onValueChange={(v) => onChange([v])}
          disabled={disabled}
          className="flex flex-wrap gap-4"
        >
          {YES_NO_OPTIONS.map((opt) => (
            <div key={opt.value} className="flex items-center gap-2">
              <RadioGroupItem
                value={opt.value}
                id={`${question.id}-${opt.value}`}
              />
              <Label
                htmlFor={`${question.id}-${opt.value}`}
                className="cursor-pointer font-normal"
              >
                {opt.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      )}

      {question.type === "SINGLE_SELECT" && (
        <Select
          value={value[0] ?? ""}
          onValueChange={(v) => onChange([v])}
          disabled={disabled}
        >
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue placeholder="Select an option..." />
          </SelectTrigger>
          <SelectContent>
            {question.options.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                {opt.text}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {question.type === "MULTI_SELECT" && (
        <div className="flex flex-wrap gap-3">
          {question.options.map((opt) => {
            const checked = value.includes(opt.id)
            return (
              <div key={opt.id} className="flex items-center gap-2">
                <Checkbox
                  id={`${question.id}-${opt.id}`}
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={(v) => {
                    onChange(
                      v ? [...value, opt.id] : value.filter((x) => x !== opt.id)
                    )
                  }}
                />
                <Label
                  htmlFor={`${question.id}-${opt.id}`}
                  className="cursor-pointer font-normal"
                >
                  {opt.text}
                </Label>
              </div>
            )
          })}
        </div>
      )}

      {question.type === "TEXT_INPUT" && (
        <Textarea
          value={value[0] ?? ""}
          onChange={(e) => onChange(e.target.value ? [e.target.value] : [])}
          disabled={disabled}
          placeholder="Type your response here…"
          rows={3}
          className="max-w-lg resize-none"
        />
      )}
    </div>
  )
}
