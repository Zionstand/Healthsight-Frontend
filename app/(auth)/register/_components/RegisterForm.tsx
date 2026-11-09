"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import * as RPNInput from "react-phone-number-input"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
import {
  PhoneInput,
  CountrySelect,
  FlagComponent,
} from "@/components/PhoneNumberInput"
import api from "@/lib/api"
import { apiErrorMessage } from "@/lib/api-error"
import { AuthShell, authLabel, stagger } from "../../_components/AuthShell"
import { PasswordInput } from "../../_components/PasswordInput"
import { SubmitButton } from "../../_components/SubmitButton"

type RoleOption = { id: string; name: string; label: string }

const schema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Enter a valid email"),
    phoneNumber: z.string().min(1, "Phone number is required"),
    districtId: z.string().optional(),
    lgaId: z.string().optional(),
    phcId: z.string().optional(),
    roleId: z.string().min(1, "Role is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type FormValues = z.infer<typeof schema>

type Location = { id: string; name: string }

const BRAND = {
  headline: "Join the district health network.",
  message:
    "Create your account to take part in facility assessments and patient care across the district.",
  note: "Every new account is reviewed by a district administrator before it can sign in.",
}

function SectionLabel({ children, n }: { children: React.ReactNode; n: number }) {
  return (
    <p
      className="animate-brand-fade-up font-ui text-xs font-medium tracking-[0.18em] text-brand-sky-700 uppercase dark:text-brand-sky-300"
      style={stagger(n)}
    >
      {children}
    </p>
  )
}

export const RegisterForm = () => {
  const [success, setSuccess] = useState(false)

  const [districts, setDistricts] = useState<Location[]>([])
  const [lgas, setLgas] = useState<Location[]>([])
  const [phcs, setPhcs] = useState<Location[]>([])
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [loadingLgas, setLoadingLgas] = useState(false)
  const [loadingPhcs, setLoadingPhcs] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      districtId: "",
      lgaId: "",
      phcId: "",
      roleId: "",
      password: "",
      confirmPassword: "",
    },
  })

  const districtId = useWatch({ control: form.control, name: "districtId" })
  const lgaId = useWatch({ control: form.control, name: "lgaId" })

  useEffect(() => {
    api.get("/locations/districts").then((res) => setDistricts(res.data))
    api.get("/roles").then((res) => setRoles(res.data))
  }, [])

  const handleDistrictChange = async (districtId: string) => {
    form.setValue("districtId", districtId)
    form.setValue("lgaId", "")
    form.setValue("phcId", "")
    setLgas([])
    setPhcs([])
    if (!districtId) return
    setLoadingLgas(true)
    try {
      const res = await api.get(`/locations/districts/${districtId}/lgas`)
      setLgas(res.data)
    } finally {
      setLoadingLgas(false)
    }
  }

  const handleLgaChange = async (lgaId: string) => {
    form.setValue("lgaId", lgaId)
    form.setValue("phcId", "")
    setPhcs([])
    if (!lgaId) return
    setLoadingPhcs(true)
    try {
      const res = await api.get(`/locations/lgas/${lgaId}/phcs`)
      setPhcs(res.data)
    } finally {
      setLoadingPhcs(false)
    }
  }

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phoneNumber: values.phoneNumber,
        password: values.password,
        confirmPassword: values.confirmPassword,
        roleId: values.roleId,
        ...(values.districtId && { districtId: values.districtId }),
        ...(values.lgaId && { lgaId: values.lgaId }),
        ...(values.phcId && { phcId: values.phcId }),
      }
      // No session yet: the account stays pending until an admin approves it.
      await api.post("/auth/register", payload)
      toast.success("Registration successful")
      setSuccess(true)
    } catch (err) {
      toast.error(apiErrorMessage(err, "Registration failed. Please try again."))
    }
  }

  if (success) {
    return (
      <AuthShell
        brand={BRAND}
        icon={<CheckCircle2 className="h-6 w-6" />}
        title="Registration received"
        description="Your account has been sent to a district administrator for approval. You'll be notified as soon as it's activated."
      >
        <Button
          asChild
          className="animate-brand-fade-up mt-8 h-12 w-full font-ui text-base font-semibold"
          style={stagger(1)}
        >
          <Link href="/">Back to sign in</Link>
        </Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      wide
      brand={BRAND}
      title="Create your account"
      description="Register as district health staff. An administrator will approve your account."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-6">
          {/* ── Your details ── */}
          <div className="space-y-4">
            <SectionLabel n={1}>Your details</SectionLabel>
            <div
              className="animate-brand-fade-up grid grid-cols-1 gap-4 sm:grid-cols-2"
              style={stagger(1)}
            >
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={authLabel}>First name</FormLabel>
                    <FormControl>
                      <Input className="h-11" placeholder="John" autoComplete="given-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={authLabel}>Last name</FormLabel>
                    <FormControl>
                      <Input className="h-11" placeholder="Doe" autoComplete="family-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={authLabel}>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        className="h-11"
                        placeholder="you@lagosstate.gov.ng"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={authLabel}>Phone number</FormLabel>
                    <FormControl>
                      <RPNInput.default
                        international
                        defaultCountry="NG"
                        value={field.value}
                        onChange={(val) => field.onChange(val || "")}
                        flagComponent={FlagComponent}
                        countrySelectComponent={CountrySelect}
                        inputComponent={PhoneInput}
                        autoComplete="tel"
                        className="flex [&_input]:h-11"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* ── Where you work ── */}
          <div className="space-y-4">
            <SectionLabel n={2}>Where you work</SectionLabel>
            <div
              className="animate-brand-fade-up grid grid-cols-1 gap-4 sm:grid-cols-2"
              style={stagger(2)}
            >
              <FormField
                control={form.control}
                name="districtId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={authLabel}>District</FormLabel>
                    <Select value={field.value} onValueChange={handleDistrictChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select district" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {districts.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
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
                name="lgaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={authLabel}>Local Government Area</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={handleLgaChange}
                      disabled={!districtId || loadingLgas}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={loadingLgas ? "Loading..." : "Select LGA"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {lgas.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name}
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
                name="phcId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={authLabel}>Primary Health Care (PHC)</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(val) => form.setValue("phcId", val)}
                      disabled={!lgaId || loadingPhcs}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={loadingPhcs ? "Loading..." : "Select PHC"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {phcs.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
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
                name="roleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={authLabel}>Role</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* ── Password ── */}
          <div className="space-y-4">
            <SectionLabel n={3}>Password</SectionLabel>
            <div
              className="animate-brand-fade-up grid grid-cols-1 gap-4 sm:grid-cols-2"
              style={stagger(3)}
            >
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={authLabel}>Password</FormLabel>
                    <FormControl>
                      <PasswordInput autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={authLabel}>Confirm password</FormLabel>
                    <FormControl>
                      <PasswordInput autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <p className="font-sans text-xs text-muted-foreground">At least 8 characters.</p>
          </div>

          <SubmitButton
            pending={form.formState.isSubmitting}
            pendingLabel="Creating account"
            style={stagger(4)}
          >
            Create account
          </SubmitButton>

          <p
            className="animate-brand-fade-up text-center font-sans text-sm text-muted-foreground"
            style={stagger(5)}
          >
            Already have an account?{" "}
            <Link href="/" className="font-ui font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </Form>
    </AuthShell>
  )
}
