"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { differenceInYears, parseISO } from "date-fns"

import { PageHeader } from "@/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
const GENOTYPES = ["AA", "AS", "SS", "AC", "SC"]
const MARITAL_STATUSES = ["Single", "Married", "Divorced", "Widowed", "Separated"]

const schema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  dateOfBirth: z.string().optional(),
  age: z.coerce.number().int().min(0).max(150),
  gender: z.enum(["MALE", "FEMALE"]),
  bloodGroup: z.string().optional(),
  genotype: z.string().optional(),
  maritalStatus: z.string().optional(),
  occupation: z.string().optional(),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  nextOfKin: z.string().optional(),
  nextOfKinPhone: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function RegisterPatientPage() {
  const router = useRouter()
  const invalidate = useInvalidate()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) as any })

  const gender = watch("gender")
  const bloodGroup = watch("bloodGroup")
  const genotype = watch("genotype")
  const maritalStatus = watch("maritalStatus")
  const dob = watch("dateOfBirth")

  const handleDobChange = (val: string) => {
    setValue("dateOfBirth", val)
    if (val) {
      const computed = differenceInYears(new Date(), parseISO(val))
      if (computed >= 0 && computed <= 150) setValue("age", computed)
    }
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const payload: any = { ...data }
      if (!payload.bloodGroup) delete payload.bloodGroup
      if (!payload.genotype) delete payload.genotype
      if (!payload.maritalStatus) delete payload.maritalStatus
      if (!payload.occupation) delete payload.occupation
      if (!payload.dateOfBirth) delete payload.dateOfBirth

      const res = await api.post("/patients", payload)
      toast.success(`Patient registered: ${res.data.patientNumber}`)
      void invalidate("/patients", "/admin/stats")
      router.push(`/patients/${res.data.id}`)
    } catch (err) {
      toast.error(apiErrorMessage(err, "Registration failed"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Register patient" back />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* ── PERSONAL INFORMATION ──────────────────────────────────── */}
        <div className="space-y-4 rounded-lg border p-6">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Personal Information
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>First Name *</Label>
              <Input {...register("firstName")} placeholder="e.g. Amina" />
              {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Last Name *</Label>
              <Input {...register("lastName")} placeholder="e.g. Bello" />
              {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Date of Birth</Label>
              <Input
                type="date"
                value={dob ?? ""}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => handleDobChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Age auto-calculated from DOB</p>
            </div>
            <div className="space-y-1.5">
              <Label>Age *</Label>
              <Input
                {...register("age")}
                type="number"
                min={0}
                max={150}
                placeholder="e.g. 35"
              />
              {errors.age && <p className="text-xs text-destructive">{errors.age.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Gender *</Label>
              <Select onValueChange={(v) => setValue("gender", v as "MALE" | "FEMALE")} value={gender}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                </SelectContent>
              </Select>
              {errors.gender && <p className="text-xs text-destructive">{errors.gender.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Marital Status</Label>
              <Select value={maritalStatus ?? ""} onValueChange={(v) => setValue("maritalStatus", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {MARITAL_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Occupation</Label>
            <Input {...register("occupation")} placeholder="e.g. Teacher, Trader" />
          </div>

          <div className="space-y-1.5">
            <Label>Phone Number</Label>
            <Input {...register("phoneNumber")} placeholder="e.g. 08012345678" />
          </div>

          <div className="space-y-1.5">
            <Label>Address</Label>
            <Textarea {...register("address")} placeholder="Patient's home address" rows={2} />
          </div>
        </div>

        {/* ── CLINICAL BASELINE ─────────────────────────────────────── */}
        <div className="space-y-4 rounded-lg border p-6">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Clinical Baseline
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Blood Group</Label>
              <Select value={bloodGroup ?? ""} onValueChange={(v) => setValue("bloodGroup", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Genotype</Label>
              <Select value={genotype ?? ""} onValueChange={(v) => setValue("genotype", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {GENOTYPES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ── NEXT OF KIN ────────────────────────────────────────────── */}
        <div className="space-y-4 rounded-lg border p-6">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Next of Kin
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Next of Kin Name</Label>
              <Input {...register("nextOfKin")} placeholder="Full name" />
            </div>
            <div className="space-y-1.5">
              <Label>Next of Kin Phone</Label>
              <Input {...register("nextOfKinPhone")} placeholder="Phone number" />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Registering…" : "Register patient"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
