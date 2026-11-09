"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { format } from "date-fns"
import { useForm, Controller } from "react-hook-form"
import { CheckCircle2 } from "lucide-react"

import { PageHeader } from "@/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/store/useAuth"
import api from "@/lib/api"
import { useApiQuery, useInvalidate } from "@/lib/queries"
import { apiErrorMessage } from "@/lib/api-error"
import { StatusBadge } from "@/components/StatusBadge"

type Screening = {
  id: string
  screeningNumber: string
  screeningType: string
  status: string
  doctorNotes?: string
  referralNote?: string
  completedAt?: string
  createdAt: string
  patient: {
    id: string
    firstName: string
    lastName: string
    patientNumber: string
    gender: string
    age: number
    phoneNumber?: string
  }
  conductedBy: { firstName: string; lastName: string }
  assessedBy?: { firstName: string; lastName: string } | null
  vitals?: any
  hypertension?: any
  diabetes?: any
  cervical?: any
  breast?: any
  psa?: any
}


const CAN_RECORD_VITALS = [
  "ADMIN",
  "NURSE",
  "MIDWIFE",
  "WARD_NURSE",
  "DENTAL_NURSE",
  "EMERGENCY_CARE_STAFF",
  "EMERGENCY_MEDICAL_TECHNICIAN",
  "MEDICAL_OFFICER",
  "CONSULTANT",
  "OBSTETRICIAN",
  "OPHTHALMOLOGIST",
  "OPTOMETRIST",
  "DENTIST",
  "DOCTOR",
]
const CAN_COMPLETE = [
  "ADMIN",
  "MEDICAL_OFFICER",
  "CONSULTANT",
  "OBSTETRICIAN",
  "OPHTHALMOLOGIST",
  "OPTOMETRIST",
  "DENTIST",
  "DOCTOR",
]
const CAN_SCREEN_HTN = ["ADMIN", "COMMUNITY_HEALTH_EXTENSION_WORKER"]
const CAN_SCREEN_DM = [
  "ADMIN",
  "MEDICAL_LABORATORY_SCIENTIST",
  "MEDICAL_LABORATORY_TECHNICIAN",
]
const CAN_SCREEN_CERVICAL = [
  "ADMIN",
  "NURSE",
  "MIDWIFE",
  "WARD_NURSE",
  "DENTAL_NURSE",
  "EMERGENCY_CARE_STAFF",
  "EMERGENCY_MEDICAL_TECHNICIAN",
]
const CAN_SCREEN_BREAST = [
  "ADMIN",
  "MEDICAL_OFFICER",
  "CONSULTANT",
  "OBSTETRICIAN",
  "OPHTHALMOLOGIST",
  "OPTOMETRIST",
  "DENTIST",
  "DOCTOR",
]
const CAN_SCREEN_PSA = [
  "ADMIN",
  "MEDICAL_LABORATORY_SCIENTIST",
  "MEDICAL_LABORATORY_TECHNICIAN",
]

export default function ScreeningDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const invalidate = useInvalidate()
  const screeningQ = useApiQuery<Screening>(`/screenings/${id}`, {
    errorMessage: "Failed to load screening",
  })
  const screening = screeningQ.data ?? null
  const loading = screeningQ.isPending
  const [saving, setSaving] = useState<string | null>(null)

  const userRoles = user?.roles?.map((r) => r.name) ?? []
  const canRecordVitals = userRoles.some((r) => CAN_RECORD_VITALS.includes(r))
  const canComplete = userRoles.some((r) => CAN_COMPLETE.includes(r))

  // After any save: refresh this record, plus the lists and stats it feeds.
  const reload = () =>
    Promise.all([
      screeningQ.refetch(),
      invalidate("/screenings", "/patients", "/admin/stats"),
    ])

  if (loading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  if (!screening)
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Screening not available</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It may have been removed, or you may not have access to it.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/screenings">Back to screenings</Link>
        </Button>
      </div>
    )

  const isDone =
    screening.status === "COMPLETED" || screening.status === "REFERRED"

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Screening — ${screening.screeningType.replace(/_/g, " ")}`}
        description={screening.screeningNumber}
        back
      />

      {/* Summary */}
      <div className="space-y-3 rounded-lg border p-5">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href={`/patients/${screening.patient.id}`}
              className="font-semibold hover:underline"
            >
              {screening.patient.firstName} {screening.patient.lastName}
            </Link>
            <p className="text-xs text-muted-foreground">
              {screening.patient.patientNumber} &bull; {screening.patient.age}{" "}
              yrs &bull; {screening.patient.gender}
            </p>
          </div>
          <StatusBadge status={screening.status} />
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <InfoField
            label="Date"
            value={format(new Date(screening.createdAt), "dd MMM yyyy")}
          />
          <InfoField
            label="Conducted By"
            value={`${screening.conductedBy.firstName} ${screening.conductedBy.lastName}`}
          />
          {screening.assessedBy && (
            <InfoField
              label="Assessed By"
              value={`${screening.assessedBy.firstName} ${screening.assessedBy.lastName}`}
            />
          )}
          {screening.completedAt && (
            <InfoField
              label="Completed"
              value={format(new Date(screening.completedAt), "dd MMM yyyy")}
            />
          )}
        </div>
      </div>

      {/* Vitals — read-only when already recorded, editable form for those who can record */}
      {screening.vitals && !canRecordVitals && (
        <VitalsDisplay vitals={screening.vitals} />
      )}
      {canRecordVitals && (
        <VitalsForm
          screening={screening}
          saving={saving === "vitals"}
          onSave={async (data) => {
            setSaving("vitals")
            try {
              await api.post("/vitals", {
                ...data,
                screeningId: id,
                patientId: screening.patient.id,
              })
              toast.success("Vitals saved")
              await reload()
            } catch (err) {
              toast.error(apiErrorMessage(err, "Failed to save vitals"))
            } finally {
              setSaving(null)
            }
          }}
        />
      )}

      {/* Pathway form — only shown when screening is still active */}
      {!isDone && (
        <PathwaySection
          screening={screening}
          userRoles={userRoles}
          saving={saving}
          setSaving={setSaving}
          onSaved={reload}
        />
      )}

      {/* Doctor assessment */}
      {canComplete && !isDone && (
        <DoctorForm
          saving={saving === "complete"}
          onComplete={async (data) => {
            setSaving("complete")
            try {
              await api.patch(`/screenings/${id}/complete`, data)
              toast.success("Screening completed")
              await reload()
            } catch (err) {
              toast.error(apiErrorMessage(err, "Failed to complete screening"))
            } finally {
              setSaving(null)
            }
          }}
        />
      )}

      {/* Completed summary */}
      {isDone && (screening.doctorNotes || screening.referralNote) && (
        <div className="space-y-3 rounded-lg border p-5">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4 text-brand-verdant-500" />
            Doctor Assessment
          </div>
          {screening.doctorNotes && (
            <p className="text-sm">
              <span className="text-muted-foreground">Notes: </span>
              {screening.doctorNotes}
            </p>
          )}
          {screening.referralNote && (
            <p className="text-sm">
              <span className="text-muted-foreground">Referral: </span>
              {screening.referralNote}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Vitals ───────────────────────────────────────────────────────────────────

function VitalsDisplay({ vitals }: { vitals: any }) {
  const rows: { label: string; value: string | undefined }[] = [
    { label: "BP Systolic (mmHg)", value: vitals.bloodPressureSystolic },
    { label: "BP Diastolic (mmHg)", value: vitals.bloodPressureDiastolic },
    { label: "Heart Rate (bpm)", value: vitals.heartRate },
    { label: "Weight (kg)", value: vitals.weight },
    { label: "Height (cm)", value: vitals.height },
    { label: "BMI", value: vitals.bmi },
    { label: "Temperature (°C)", value: vitals.temperature },
    { label: "SpO₂ (%)", value: vitals.oxygenSaturation },
  ].filter((r) => r.value != null)

  return (
    <div className="space-y-4 rounded-lg border p-5">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        Vitals
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {rows.map((r) => (
          <div key={r.label} className="space-y-1">
            <p className="text-xs text-muted-foreground">{r.label}</p>
            <p className="font-medium">{r.value}</p>
          </div>
        ))}
      </div>
      {vitals.notes && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Notes</p>
          <p className="text-sm">{vitals.notes}</p>
        </div>
      )}
    </div>
  )
}

function VitalsForm({
  screening,
  saving,
  onSave,
}: {
  screening: Screening
  saving: boolean
  onSave: (d: any) => void
}) {
  const { register, handleSubmit } = useForm({
    defaultValues: screening.vitals ?? {},
  })

  const handleSave = (data: any) => {
    const cleaned = Object.fromEntries(
      Object.entries(data).filter(
        ([, v]) => v !== "" && v !== null && !Number.isNaN(v)
      )
    )
    onSave(cleaned)
  }

  return (
    <div className="space-y-4 rounded-lg border p-5">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        Vitals
      </h2>
      <form
        onSubmit={handleSubmit(handleSave)}
        className="grid grid-cols-2 gap-4 sm:grid-cols-3"
      >
        <TextField
          label="BP Systolic (mmHg)"
          name="bloodPressureSystolic"
          register={register}
          type="number"
        />
        <TextField
          label="BP Diastolic (mmHg)"
          name="bloodPressureDiastolic"
          register={register}
          type="number"
        />
        <TextField
          label="Heart Rate (bpm)"
          name="heartRate"
          register={register}
          type="number"
        />
        <TextField
          label="Weight (kg)"
          name="weight"
          register={register}
          type="number"
          step="0.1"
        />
        <TextField
          label="Height (cm)"
          name="height"
          register={register}
          type="number"
          step="0.1"
        />
        <TextField
          label="Temperature (°C)"
          name="temperature"
          register={register}
          type="number"
          step="0.1"
        />
        <TextField
          label="SpO₂ (%)"
          name="oxygenSaturation"
          register={register}
          type="number"
        />
        <div className="col-span-2 space-y-1.5 sm:col-span-3">
          <Label>Notes</Label>
          <Textarea {...register("notes")} rows={2} />
        </div>
        <div className="col-span-2 sm:col-span-3">
          <Button type="submit" disabled={saving}>
            {saving
              ? "Saving…"
              : screening.vitals
                ? "Update Vitals"
                : "Record Vitals"}
          </Button>
        </div>
      </form>
    </div>
  )
}

// ─── Pathway routing ──────────────────────────────────────────────────────────

function PathwaySection({
  screening,
  userRoles,
  saving,
  setSaving,
  onSaved,
}: any) {
  const { screeningType } = screening

  if (
    screeningType === "HYPERTENSION" &&
    userRoles.some((r: string) => CAN_SCREEN_HTN.includes(r))
  )
    return (
      <HypertensionForm
        existing={screening.hypertension}
        screeningId={screening.id}
        saving={saving === "pathway"}
        setSaving={setSaving}
        onSaved={onSaved}
      />
    )

  if (
    screeningType === "DIABETES" &&
    userRoles.some((r: string) => CAN_SCREEN_DM.includes(r))
  )
    return (
      <DiabetesForm
        existing={screening.diabetes}
        screeningId={screening.id}
        saving={saving === "pathway"}
        setSaving={setSaving}
        onSaved={onSaved}
      />
    )

  if (
    screeningType === "CERVICAL_CANCER" &&
    userRoles.some((r: string) => CAN_SCREEN_CERVICAL.includes(r))
  )
    return (
      <CervicalForm
        existing={screening.cervical}
        screeningId={screening.id}
        saving={saving === "pathway"}
        setSaving={setSaving}
        onSaved={onSaved}
      />
    )

  if (
    screeningType === "BREAST_CANCER" &&
    userRoles.some((r: string) => CAN_SCREEN_BREAST.includes(r))
  )
    return (
      <BreastForm
        existing={screening.breast}
        screeningId={screening.id}
        saving={saving === "pathway"}
        setSaving={setSaving}
        onSaved={onSaved}
      />
    )

  if (
    screeningType === "PSA" &&
    userRoles.some((r: string) => CAN_SCREEN_PSA.includes(r))
  )
    return (
      <PsaForm
        existing={screening.psa}
        screeningId={screening.id}
        saving={saving === "pathway"}
        setSaving={setSaving}
        onSaved={onSaved}
      />
    )

  return null
}

// ─── Pathway forms ────────────────────────────────────────────────────────────

function HypertensionForm({
  existing,
  screeningId,
  saving,
  setSaving,
  onSaved,
}: any) {
  const { register, handleSubmit, control } = useForm({
    defaultValues: {
      familyHistory: false,
      smokingStatus: false,
      alcoholUse: false,
      previousDiagnosis: false,
      onMedication: false,
      referToDoctor: false,
      physicalActivity: "",
      saltIntake: "",
      medicationDetails: "",
      clinicalObservations: "",
      recommendations: "",
      referralReason: "",
      screeningResult: "",
      result: "",
      ...existing,
    },
  })
  const submit = async (data: any) => {
    setSaving("pathway")
    try {
      const cleaned = Object.fromEntries(
        Object.entries(data).filter(
          ([, v]) => v !== "" && v !== null && !Number.isNaN(v)
        )
      )
      await api.post(`/screenings/${screeningId}/hypertension`, cleaned)
      toast.success("Saved")
      onSaved()
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed"))
    } finally {
      setSaving(null)
    }
  }
  return (
    <div className="space-y-5 rounded-lg border p-5">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        Hypertension Screening
      </h2>
      <form onSubmit={handleSubmit(submit)} className="space-y-5">
        {/* BP Readings */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase">
            Blood Pressure Readings
          </p>
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="grid grid-cols-2 gap-3 rounded border p-3 sm:grid-cols-4"
            >
              <p className="col-span-2 text-xs font-medium text-muted-foreground sm:col-span-4">
                Reading {n}
                {n === 1 ? " (required)" : " (optional)"}
              </p>
              <TextField
                label="Systolic (mmHg)"
                name={`systolicBp${n}`}
                register={register}
                type="number"
              />
              <TextField
                label="Diastolic (mmHg)"
                name={`diastolicBp${n}`}
                register={register}
                type="number"
              />
              <div className="space-y-1.5">
                <Label>Position</Label>
                <Controller
                  name={`position${n}`}
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SITTING">Sitting</SelectItem>
                        <SelectItem value="STANDING">Standing</SelectItem>
                        <SelectItem value="LYING">Lying</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Arm Used</Label>
                <Controller
                  name={`armUsed${n}`}
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LEFT">Left</SelectItem>
                        <SelectItem value="RIGHT">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          ))}
        </div>
        {/* Risk Factors */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">
            Risk Factors
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <BoolField
              control={control}
              name="familyHistory"
              label="Family History"
            />
            <BoolField control={control} name="smokingStatus" label="Smoking" />
            <BoolField
              control={control}
              name="alcoholUse"
              label="Alcohol Use"
            />
            <BoolField
              control={control}
              name="previousDiagnosis"
              label="Previous Diagnosis"
            />
            <BoolField
              control={control}
              name="onMedication"
              label="On Medication"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Physical Activity"
              name="physicalActivity"
              register={register}
            />
            <TextField
              label="Salt Intake"
              name="saltIntake"
              register={register}
            />
            <TextField
              label="Medication Details"
              name="medicationDetails"
              register={register}
            />
          </div>
        </div>
        {/* Findings */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase">
            Findings & Assessment
          </p>
          <TextField
            label="Clinical Observations"
            name="clinicalObservations"
            register={register}
          />
          <TextField
            label="Recommendations"
            name="recommendations"
            register={register}
          />
          <div className="space-y-1.5">
            <Label>Screening Result</Label>
            <Controller
              name="screeningResult"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select result" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="ELEVATED">Elevated</SelectItem>
                    <SelectItem value="HIGH_STAGE_1">High — Stage 1</SelectItem>
                    <SelectItem value="HIGH_STAGE_2">High — Stage 2</SelectItem>
                    <SelectItem value="CRISIS">Hypertensive Crisis</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <TextField
            label="Additional Notes"
            name="result"
            register={register}
          />
          <BoolField
            control={control}
            name="referToDoctor"
            label="Refer to Doctor"
          />
          <TextField
            label="Referral Reason"
            name="referralReason"
            register={register}
          />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </form>
    </div>
  )
}

function DiabetesForm({
  existing,
  screeningId,
  saving,
  setSaving,
  onSaved,
}: any) {
  const { register, handleSubmit, control, watch } = useForm({
    defaultValues: {
      testType: "",
      bloodSugarUnit: "",
      screeningResult: "",
      fastingBloodSugar: "",
      randomBloodSugar: "",
      hba1c: "",
      fastingDurationHours: "",
      testTime: "",
      familyHistory: false,
      previousDiagnosis: false,
      onMedication: false,
      referToDoctor: false,
      medicationDetails: "",
      clinicalObservations: "",
      referralReason: "",
      result: "",
      ...existing,
    },
  })
  const testType = watch("testType")
  const submit = async (data: any) => {
    setSaving("pathway")
    try {
      const cleaned = Object.fromEntries(
        Object.entries(data).filter(
          ([, v]) => v !== "" && v !== null && !Number.isNaN(v)
        )
      )
      await api.post(`/screenings/${screeningId}/diabetes`, cleaned)
      toast.success("Saved")
      onSaved()
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed"))
    } finally {
      setSaving(null)
    }
  }
  return (
    <div className="space-y-5 rounded-lg border p-5">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        Diabetes Screening
      </h2>
      <form onSubmit={handleSubmit(submit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Test Type</Label>
            <Controller
              name="testType"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RANDOM">Random</SelectItem>
                    <SelectItem value="FASTING">Fasting</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Unit</Label>
            <Controller
              name="bloodSugarUnit"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MG_DL">mg/dL</SelectItem>
                    <SelectItem value="MMOL_L">mmol/L</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <TextField
            label="Test Time"
            name="testTime"
            register={register}
            type="time"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {testType === "FASTING" && (
            <TextField
              label="Fasting Duration (hrs)"
              name="fastingDurationHours"
              register={register}
              type="number"
            />
          )}
          <TextField
            label="Fasting Blood Sugar"
            name="fastingBloodSugar"
            register={register}
            type="number"
            step="0.1"
          />
          <TextField
            label="Random Blood Sugar"
            name="randomBloodSugar"
            register={register}
            type="number"
            step="0.1"
          />
          <TextField
            label="HbA1c (%)"
            name="hba1c"
            register={register}
            type="number"
            step="0.1"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <BoolField
            control={control}
            name="familyHistory"
            label="Family History"
          />
          <BoolField
            control={control}
            name="previousDiagnosis"
            label="Previous Diagnosis"
          />
          <BoolField
            control={control}
            name="onMedication"
            label="On Medication"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Medication Details"
            name="medicationDetails"
            register={register}
          />
          <TextField
            label="Clinical Observations"
            name="clinicalObservations"
            register={register}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Screening Result</Label>
          <Controller
            name="screeningResult"
            control={control}
            render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select result" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="PREDIABETES">Pre-diabetes</SelectItem>
                  <SelectItem value="DIABETES">Diabetes</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <TextField label="Additional Notes" name="result" register={register} />
        <BoolField
          control={control}
          name="referToDoctor"
          label="Refer to Doctor"
        />
        <TextField
          label="Referral Reason"
          name="referralReason"
          register={register}
        />
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </form>
    </div>
  )
}

function CervicalForm({
  existing,
  screeningId,
  saving,
  setSaving,
  onSaved,
}: any) {
  const { register, handleSubmit, control, watch } = useForm({
    defaultValues: {
      screeningMethod: "",
      screeningResult: "",
      specimenCollected: false,
      abnormalBleeding: false,
      colposcopyDone: false,
      followUpRequired: false,
      otherMethodDetails: "",
      specimenType: "",
      visualInspectionFindings: "",
      lastPapSmearDate: "",
      papSmearResult: "",
      hpvStatus: "",
      viaResult: "",
      clinicalObservations: "",
      remarks: "",
      followUpDate: "",
      followUpNotes: "",
      result: "",
      ...existing,
    },
  })
  const method = watch("screeningMethod")
  const followUpRequired = watch("followUpRequired")
  const submit = async (data: any) => {
    setSaving("pathway")
    try {
      const cleaned = Object.fromEntries(
        Object.entries(data).filter(
          ([, v]) => v !== "" && v !== null && !Number.isNaN(v)
        )
      )
      await api.post(`/screenings/${screeningId}/cervical`, cleaned)
      toast.success("Saved")
      onSaved()
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed"))
    } finally {
      setSaving(null)
    }
  }
  return (
    <div className="space-y-5 rounded-lg border p-5">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        Cervical Cancer Screening
      </h2>
      <form onSubmit={handleSubmit(submit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Screening Method</Label>
            <Controller
              name="screeningMethod"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIA">VIA</SelectItem>
                    <SelectItem value="VILI">VILI</SelectItem>
                    <SelectItem value="PAP_SMEAR">Pap Smear</SelectItem>
                    <SelectItem value="HPV_TEST">HPV Test</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          {method === "OTHER" && (
            <TextField
              label="Other Method Details"
              name="otherMethodDetails"
              register={register}
            />
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <TextField label="VIA Result" name="viaResult" register={register} />
          <TextField label="HPV Status" name="hpvStatus" register={register} />
          <TextField
            label="Last Pap Smear Date"
            name="lastPapSmearDate"
            register={register}
            type="date"
          />
          <TextField
            label="Pap Smear Result"
            name="papSmearResult"
            register={register}
          />
        </div>
        <TextField
          label="Visual Inspection Findings"
          name="visualInspectionFindings"
          register={register}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <BoolField
            control={control}
            name="specimenCollected"
            label="Specimen Collected"
          />
          <BoolField
            control={control}
            name="abnormalBleeding"
            label="Abnormal Bleeding"
          />
          <BoolField
            control={control}
            name="colposcopyDone"
            label="Colposcopy Done"
          />
        </div>
        <TextField
          label="Specimen Type"
          name="specimenType"
          register={register}
        />
        <TextField
          label="Clinical Observations"
          name="clinicalObservations"
          register={register}
        />
        <TextField label="Remarks" name="remarks" register={register} />
        <div className="space-y-1.5">
          <Label>Screening Result</Label>
          <Controller
            name="screeningResult"
            control={control}
            render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select result" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEGATIVE">Negative</SelectItem>
                  <SelectItem value="POSITIVE">Positive</SelectItem>
                  <SelectItem value="SUSPICIOUS">Suspicious</SelectItem>
                  <SelectItem value="INCONCLUSIVE">Inconclusive</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <TextField label="Additional Notes" name="result" register={register} />
        <div className="space-y-3 rounded border p-3">
          <BoolField
            control={control}
            name="followUpRequired"
            label="Follow-up Required"
          />
          {followUpRequired && (
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Follow-up Date"
                name="followUpDate"
                register={register}
                type="date"
              />
              <TextField
                label="Follow-up Notes"
                name="followUpNotes"
                register={register}
              />
            </div>
          )}
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </form>
    </div>
  )
}

function BreastForm({
  existing,
  screeningId,
  saving,
  setSaving,
  onSaved,
}: any) {
  const { register, handleSubmit, control, watch } = useForm({
    defaultValues: {
      selfExamination: false,
      mammogramDone: false,
      familyHistory: false,
      lumpDetected: false,
      dischargePresent: false,
      nippleInversion: false,
      referralRequired: false,
      dischargeLaterality: "",
      nippleInversionLaterality: "",
      lymphNodeStatus: "",
      riskAssessment: "",
      clinicalExamResult: "",
      mammogramResult: "",
      lumpLocation: "",
      lumpSize: "",
      lumpCharacteristics: "",
      dischargeType: "",
      lymphNodeLocation: "",
      skinChanges: "",
      breastSymmetry: "",
      summaryFindings: "",
      recommendations: "",
      referralFacility: "",
      referralReason: "",
      result: "",
      ...existing,
    },
  })
  const lumpDetected = watch("lumpDetected")
  const dischargePresent = watch("dischargePresent")
  const nippleInversion = watch("nippleInversion")
  const submit = async (data: any) => {
    setSaving("pathway")
    try {
      const cleaned = Object.fromEntries(
        Object.entries(data).filter(
          ([, v]) => v !== "" && v !== null && !Number.isNaN(v)
        )
      )
      await api.post(`/screenings/${screeningId}/breast`, cleaned)
      toast.success("Saved")
      onSaved()
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed"))
    } finally {
      setSaving(null)
    }
  }
  return (
    <div className="space-y-5 rounded-lg border p-5">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        Breast Cancer Screening
      </h2>
      <form onSubmit={handleSubmit(submit)} className="space-y-5">
        {/* Examination */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <BoolField
            control={control}
            name="selfExamination"
            label="Self Examination"
          />
          <BoolField
            control={control}
            name="mammogramDone"
            label="Mammogram Done"
          />
          <BoolField
            control={control}
            name="familyHistory"
            label="Family History"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Clinical Exam Result"
            name="clinicalExamResult"
            register={register}
          />
          <TextField
            label="Mammogram Result"
            name="mammogramResult"
            register={register}
          />
        </div>
        {/* Lump */}
        <div className="space-y-3 rounded border p-3">
          <BoolField
            control={control}
            name="lumpDetected"
            label="Lump Detected"
          />
          {lumpDetected && (
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Lump Location"
                name="lumpLocation"
                register={register}
              />
              <TextField
                label="Lump Size"
                name="lumpSize"
                register={register}
              />
              <TextField
                label="Lump Characteristics"
                name="lumpCharacteristics"
                register={register}
              />
            </div>
          )}
        </div>
        {/* Discharge */}
        <div className="space-y-3 rounded border p-3">
          <BoolField
            control={control}
            name="dischargePresent"
            label="Discharge Present"
          />
          {dischargePresent && (
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Discharge Type"
                name="dischargeType"
                register={register}
              />
              <div className="space-y-1.5">
                <Label>Discharge Laterality</Label>
                <Controller
                  name="dischargeLaterality"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LEFT">Left</SelectItem>
                        <SelectItem value="RIGHT">Right</SelectItem>
                        <SelectItem value="BILATERAL">Bilateral</SelectItem>
                        <SelectItem value="NONE">None</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          )}
        </div>
        {/* Nipple */}
        <div className="space-y-3 rounded border p-3">
          <BoolField
            control={control}
            name="nippleInversion"
            label="Nipple Inversion"
          />
          {nippleInversion && (
            <div className="space-y-1.5">
              <Label>Nipple Inversion Laterality</Label>
              <Controller
                name="nippleInversionLaterality"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LEFT">Left</SelectItem>
                      <SelectItem value="RIGHT">Right</SelectItem>
                      <SelectItem value="BILATERAL">Bilateral</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}
        </div>
        {/* Lymph nodes & other */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Lymph Node Status</Label>
            <Controller
              name="lymphNodeStatus"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="ENLARGED">Enlarged</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <TextField
            label="Lymph Node Location"
            name="lymphNodeLocation"
            register={register}
          />
          <TextField
            label="Skin Changes"
            name="skinChanges"
            register={register}
          />
          <TextField
            label="Breast Symmetry"
            name="breastSymmetry"
            register={register}
          />
        </div>
        <TextField
          label="Summary Findings"
          name="summaryFindings"
          register={register}
        />
        {/* Assessment */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Risk Assessment</Label>
            <Controller
              name="riskAssessment"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MODERATE">Moderate</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <TextField
            label="Recommendations"
            name="recommendations"
            register={register}
          />
        </div>
        <TextField label="Additional Notes" name="result" register={register} />
        <div className="space-y-3 rounded border p-3">
          <BoolField
            control={control}
            name="referralRequired"
            label="Referral Required"
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Referral Facility"
              name="referralFacility"
              register={register}
            />
            <TextField
              label="Referral Reason"
              name="referralReason"
              register={register}
            />
          </div>
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </form>
    </div>
  )
}

function PsaForm({ existing, screeningId, saving, setSaving, onSaved }: any) {
  const { register, handleSubmit, control } = useForm({
    defaultValues: {
      digitalRectalExam: false,
      familyHistory: false,
      urinarySymptoms: false,
      referToDoctor: false,
      screeningResult: "",
      psaLevel: "",
      unit: "ng/mL",
      testMethod: "",
      testKit: "",
      collectionTime: "",
      sampleQuality: "adequate",
      sampleQualityNotes: "",
      normalRangeMin: "",
      normalRangeMax: "",
      dreResult: "",
      clinicalObservations: "",
      referralReason: "",
      resultInterpretation: "",
      result: "",
      ...existing,
    },
  })
  const submit = async (data: any) => {
    setSaving("pathway")
    try {
      const cleaned = Object.fromEntries(
        Object.entries(data).filter(
          ([, v]) => v !== "" && v !== null && !Number.isNaN(v)
        )
      )
      await api.post(`/screenings/${screeningId}/psa`, cleaned)
      toast.success("Saved")
      onSaved()
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed"))
    } finally {
      setSaving(null)
    }
  }
  return (
    <div className="space-y-5 rounded-lg border p-5">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        PSA Screening
      </h2>
      <form onSubmit={handleSubmit(submit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <TextField
            label="PSA Level"
            name="psaLevel"
            register={register}
            type="number"
            step="0.01"
          />
          <TextField label="Unit" name="unit" register={register} />
          <TextField
            label="Collection Time"
            name="collectionTime"
            register={register}
            type="time"
          />
          <TextField
            label="Test Method"
            name="testMethod"
            register={register}
          />
          <TextField label="Test Kit" name="testKit" register={register} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Normal Range Min"
            name="normalRangeMin"
            register={register}
            type="number"
            step="0.01"
          />
          <TextField
            label="Normal Range Max"
            name="normalRangeMax"
            register={register}
            type="number"
            step="0.01"
          />
          <TextField
            label="Sample Quality"
            name="sampleQuality"
            register={register}
          />
          <TextField
            label="Sample Quality Notes"
            name="sampleQualityNotes"
            register={register}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <BoolField
            control={control}
            name="digitalRectalExam"
            label="Digital Rectal Exam"
          />
          <BoolField
            control={control}
            name="familyHistory"
            label="Family History"
          />
          <BoolField
            control={control}
            name="urinarySymptoms"
            label="Urinary Symptoms"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextField label="DRE Result" name="dreResult" register={register} />
          <TextField
            label="Clinical Observations"
            name="clinicalObservations"
            register={register}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Screening Result</Label>
          <Controller
            name="screeningResult"
            control={control}
            render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select result" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="BORDERLINE">Borderline</SelectItem>
                  <SelectItem value="ELEVATED">Elevated</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <TextField
          label="Result Interpretation"
          name="resultInterpretation"
          register={register}
        />
        <TextField label="Additional Notes" name="result" register={register} />
        <BoolField
          control={control}
          name="referToDoctor"
          label="Refer to Doctor"
        />
        <TextField
          label="Referral Reason"
          name="referralReason"
          register={register}
        />
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </form>
    </div>
  )
}

// ─── Doctor assessment ────────────────────────────────────────────────────────

function DoctorForm({
  saving,
  onComplete,
}: {
  saving: boolean
  onComplete: (d: any) => void
}) {
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      status: "COMPLETED",
      patientStatus: "",
      doctorNotes: "",
      prescription: "",
      referralNote: "",
      nextAppointmentDate: "",
    },
  })
  const status = watch("status")
  return (
    <div className="space-y-4 rounded-lg border p-5">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        Doctor Assessment
      </h2>
      <form onSubmit={handleSubmit(onComplete)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Outcome</Label>
            <Select value={status} onValueChange={(v) => setValue("status", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COMPLETED">
                  Completed — No referral
                </SelectItem>
                <SelectItem value="REFERRED">Referred</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Patient Status</Label>
            <Select
              value={watch("patientStatus")}
              onValueChange={(v) => setValue("patientStatus", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NORMAL">Normal</SelectItem>
                <SelectItem value="ABNORMAL">Abnormal</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="REQUIRES_FOLLOWUP">
                  Requires Follow-up
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Doctor Notes</Label>
          <Textarea
            {...register("doctorNotes")}
            rows={3}
            placeholder="Clinical notes…"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Prescription</Label>
          <Textarea
            {...register("prescription")}
            rows={2}
            placeholder="Medications prescribed…"
          />
        </div>
        <TextField
          label="Next Appointment Date"
          name="nextAppointmentDate"
          register={register}
          type="date"
        />
        {status === "REFERRED" && (
          <div className="space-y-1.5">
            <Label>Referral Note</Label>
            <Textarea
              {...register("referralNote")}
              rows={2}
              placeholder="Referral details…"
            />
          </div>
        )}
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Complete Screening"}
        </Button>
      </form>
    </div>
  )
}

// ─── Shared field components ──────────────────────────────────────────────────

function TextField({ label, name, register, type = "text", step }: any) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        {...register(name, type === "number" ? { valueAsNumber: true } : {})}
        type={type}
        step={step}
      />
    </div>
  )
}

function BoolField({
  label,
  name,
  control,
}: {
  label: string
  name: string
  control: any
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <div className="flex items-center gap-2 pt-2">
          <Checkbox
            id={name}
            checked={!!field.value}
            onCheckedChange={(checked) => field.onChange(!!checked)}
          />
          <Label htmlFor={name}>{label}</Label>
        </div>
      )}
    />
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}
