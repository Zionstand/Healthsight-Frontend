"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import { Check, Info, Loader2, MapPin } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/lib/queries"
import { cn } from "@/lib/utils"

export type FacilitySubmission = {
  answeredCount: number
  createdAt: string
  updatedAt: string
  lastSavedBy: { firstName: string; lastName: string } | null
  daysLeft: number
}

type Facilities = {
  totalQuestions: number
  district: { id: string; name: string } | null
  lgas: {
    id: string
    name: string
    phcs: { id: string; name: string; submission: FacilitySubmission | null }[]
  }[]
}

function phcStatus(s: FacilitySubmission | null, total: number) {
  if (!s) return { label: "Not started", className: "text-muted-foreground" }
  if (total > 0 && s.answeredCount >= total)
    return { label: "Complete", className: "text-brand-verdant-600 dark:text-brand-verdant-400" }
  return {
    label: `Started · ${s.answeredCount}/${total}`,
    className: "text-brand-amber-600 dark:text-brand-amber-400",
  }
}

/**
 * Directors record assessments for any PHC in their district. This asks which
 * one, District → Local Government → PHC, and shows each PHC's progress so a
 * director can see another director has already started it before opening it.
 */
export function FacilityPicker({
  periodId,
  open,
  onOpenChange,
  current,
  onChoose,
  choosing,
}: {
  periodId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The PHC already open on the form, if any. */
  current?: { id: string; lgaId: string } | null
  onChoose: (phcId: string) => void
  /** True while the form saves pending answers before switching. */
  choosing?: boolean
}) {
  const { data, isPending } = useApiQuery<Facilities>(
    open ? `/assessment/periods/${periodId}/facilities` : null,
    { errorMessage: "Couldn't load the health centres in your district" }
  )

  // Reset the selection to the open PHC each time the box opens.
  const [opened, setOpened] = useState(open)
  const [lgaId, setLgaId] = useState(current?.lgaId ?? "")
  const [phcId, setPhcId] = useState(current?.id ?? "")
  if (open !== opened) {
    setOpened(open)
    if (open) {
      setLgaId(current?.lgaId ?? "")
      setPhcId(current?.id ?? "")
    }
  }

  const total = data?.totalQuestions ?? 0
  const lga = data?.lgas.find((l) => l.id === lgaId)
  const phc = lga?.phcs.find((p) => p.id === phcId)

  const lgaSummary = useMemo(() => {
    const out: Record<string, { started: number; count: number }> = {}
    for (const l of data?.lgas ?? []) {
      out[l.id] = { started: l.phcs.filter((p) => p.submission).length, count: l.phcs.length }
    }
    return out
  }, [data])

  const s = phc?.submission ?? null
  const editingClosed = !!s && s.daysLeft === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="size-4 text-primary" />
            Location selection
          </DialogTitle>
          <DialogDescription>
            Choose the health centre this assessment is for. Each PHC has one assessment per
            period, shared by every director.
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="District" done={!!data?.district}>
              <Select value={data?.district?.id ?? ""} disabled>
                {/* One district per director: shown as chosen, not as a disabled control. */}
                <SelectTrigger
                  className={cn("w-full disabled:cursor-default disabled:opacity-100", data?.district && DONE)}
                  aria-label="District"
                >
                  <SelectValue placeholder="District">{data?.district?.name}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {data?.district && (
                    <SelectItem value={data.district.id}>{data.district.name}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Local Government" done={!!lga}>
              <Select
                value={lgaId}
                onValueChange={(v) => {
                  setLgaId(v)
                  setPhcId("")
                }}
              >
                <SelectTrigger className={cn("w-full", lga && DONE)} aria-label="Local Government">
                  <SelectValue placeholder="Select LGA">{lga?.name}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {data?.lgas.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      <span>{l.name}</span>
                      <span className="ml-auto pl-3 text-xs text-muted-foreground">
                        {lgaSummary[l.id]?.started}/{lgaSummary[l.id]?.count} started
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Primary Health Center" done={!!phc}>
              <Select value={phcId} onValueChange={setPhcId} disabled={!lga}>
                <SelectTrigger className={cn("w-full", phc && DONE)} aria-label="Primary Health Center">
                  <SelectValue placeholder={lga ? "Select PHC" : "Choose an LGA first"}>
                    {phc?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {lga?.phcs.map((p) => {
                    const st = phcStatus(p.submission, total)
                    return (
                      <SelectItem key={p.id} value={p.id}>
                        <span>{p.name}</span>
                        <span className={cn("ml-auto pl-3 text-xs", st.className)}>{st.label}</span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </Field>
          </div>
        )}

        {phc && (
          <div
            className={cn(
              "flex gap-3 rounded-lg border p-3 text-sm",
              s
                ? "border-brand-amber-300 bg-brand-amber-50 text-brand-amber-900 dark:border-brand-amber-800 dark:bg-brand-amber-900/20 dark:text-brand-amber-200"
                : "bg-muted/50 text-muted-foreground"
            )}
          >
            <Info className="mt-0.5 size-4 shrink-0" />
            {s ? (
              <div className="space-y-1">
                <p className="font-medium">
                  {phc.name} already has an assessment for this period.
                </p>
                <p>
                  Started {format(new Date(s.createdAt), "dd MMM yyyy")}
                  {s.lastSavedBy &&
                    `, last saved by ${s.lastSavedBy.firstName} ${s.lastSavedBy.lastName}`}{" "}
                  on {format(new Date(s.updatedAt), "dd MMM yyyy, HH:mm")}. {s.answeredCount} of{" "}
                  {total} questions answered.
                </p>
                <p>
                  {editingClosed
                    ? "Its 7-day editing window has closed, so you can review it but not change it."
                    : "You'll continue the same assessment: the answers already given are kept, and nothing is submitted twice."}
                </p>
              </div>
            ) : (
              <p>No one has started {phc.name}'s assessment for this period yet.</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!phc || choosing} onClick={() => phc && onChoose(phc.id)}>
            {choosing && <Loader2 className="animate-spin" />}
            {!s ? "Start assessment" : editingClosed ? "Review assessment" : "Continue assessment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const DONE =
  "border-brand-verdant-600/60 ring-2 ring-brand-verdant-500/15 dark:border-brand-verdant-500/60"

function Field({
  label,
  done,
  children,
}: {
  label: string
  done: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5">
        {label} <span className="text-destructive">*</span>
        {done && (
          <Check className="ml-auto size-4 text-brand-verdant-600 dark:text-brand-verdant-400" aria-label="Selected" />
        )}
      </Label>
      {children}
    </div>
  )
}
