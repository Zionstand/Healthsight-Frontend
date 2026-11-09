"use client"

import { Suspense, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { ArrowLeft, KeyRound, Mail, ShieldCheck } from "lucide-react"

import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import api from "@/lib/api"
import { apiErrorMessage } from "@/lib/api-error"
import { AuthShell, authLabel, stagger } from "../_components/AuthShell"
import { PasswordInput } from "../_components/PasswordInput"
import { SubmitButton } from "../_components/SubmitButton"

const BRAND = {
  headline: "Get back into your account.",
  message:
    "We'll email you a one-time code so you can choose a new password securely.",
  note: "Reset codes expire after 10 minutes and work only once.",
}

function StepMarker({ step }: { step: 1 | 2 | 3 }) {
  return (
    <span className="mb-3 block font-ui text-xs font-medium tracking-[0.18em] text-brand-sky-700 uppercase dark:text-brand-sky-300">
      Step {step} of 3
    </span>
  )
}

const linkButton =
  "inline-flex items-center gap-1 font-ui text-sm text-muted-foreground transition-colors hover:text-foreground"

// ─── Step 1: Email ─────────────────────────────────────────────────────────

const emailSchema = z.object({
  email: z.string().email("Enter a valid email address"),
})
type EmailValues = z.infer<typeof emailSchema>

function StepEmail({ onNext }: { onNext: (email: string) => void }) {
  const form = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  })

  async function onSubmit(values: EmailValues) {
    try {
      await api.post("/auth/forgot-password", { email: values.email })
      toast.success("If that email is registered, a code is on its way.")
      onNext(values.email)
    } catch (err) {
      toast.error(apiErrorMessage(err, "Something went wrong"))
    }
  }

  return (
    <AuthShell
      brand={BRAND}
      icon={<Mail className="h-6 w-6" />}
      title={
        <>
          <StepMarker step={1} />
          Forgot your password?
        </>
      }
      description="Enter your email and we'll send you a 6-digit code."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="animate-brand-fade-up" style={stagger(1)}>
                <FormLabel className={authLabel}>Email</FormLabel>
                <FormControl>
                  <Input
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

          <SubmitButton
            pending={form.formState.isSubmitting}
            pendingLabel="Sending code"
            style={stagger(2)}
          >
            Send code
          </SubmitButton>

          <div className="animate-brand-fade-up flex justify-center pt-2" style={stagger(3)}>
            <Link href="/" className={linkButton}>
              <ArrowLeft size={14} />
              Back to sign in
            </Link>
          </div>
        </form>
      </Form>
    </AuthShell>
  )
}

// ─── Step 2: OTP verification ────────────────────────────────────────────────

const otpSchema = z.object({
  otp: z.string().length(6, "The code is 6 digits").regex(/^\d+$/, "The code is numbers only"),
})
type OtpValues = z.infer<typeof otpSchema>

function StepOtp({
  email,
  onNext,
  onBack,
}: {
  email: string
  onNext: (otp: string) => void
  onBack: () => void
}) {
  const form = useForm<OtpValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  })

  async function onSubmit(values: OtpValues) {
    try {
      await api.post("/auth/verify-otp", { email, otp: values.otp })
      toast.success("Code verified.")
      onNext(values.otp)
    } catch (err) {
      toast.error(apiErrorMessage(err, "Invalid or expired code"))
    }
  }

  async function resend() {
    try {
      await api.post("/auth/forgot-password", { email })
      toast.success("A new code has been sent.")
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not resend the code. Try again."))
    }
  }

  return (
    <AuthShell
      brand={BRAND}
      icon={<ShieldCheck className="h-6 w-6" />}
      title={
        <>
          <StepMarker step={2} />
          Check your email
        </>
      }
      description={
        <>
          We sent a 6-digit code to{" "}
          <span className="font-medium text-foreground">{email}</span>.
        </>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5">
          <FormField
            control={form.control}
            name="otp"
            render={({ field }) => (
              <FormItem className="animate-brand-fade-up" style={stagger(1)}>
                <FormLabel className={authLabel}>One-time code</FormLabel>
                <FormControl>
                  <Input
                    placeholder="123456"
                    maxLength={6}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="h-11 text-center text-lg tracking-[0.5em]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <SubmitButton
            pending={form.formState.isSubmitting}
            pendingLabel="Verifying code"
            style={stagger(2)}
          >
            Verify code
          </SubmitButton>

          <div
            className="animate-brand-fade-up flex items-center justify-between pt-2"
            style={stagger(3)}
          >
            <button type="button" onClick={onBack} className={linkButton}>
              <ArrowLeft size={14} />
              Change email
            </button>
            <button
              type="button"
              onClick={resend}
              className="font-ui text-sm font-semibold text-primary hover:underline"
            >
              Resend code
            </button>
          </div>
        </form>
      </Form>
    </AuthShell>
  )
}

// ─── Step 3: New password ────────────────────────────────────────────────────

const passwordSchema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
type PasswordValues = z.infer<typeof passwordSchema>

function StepNewPassword({
  email,
  otp,
  onBack,
}: {
  email: string
  otp: string
  onBack: () => void
}) {
  const router = useRouter()

  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  })

  async function onSubmit(values: PasswordValues) {
    try {
      await api.post("/auth/reset-password", {
        email,
        otp,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      })
      toast.success("Password reset. You can now sign in.")
      router.push("/")
    } catch (err) {
      toast.error(apiErrorMessage(err, "Something went wrong"))
    }
  }

  return (
    <AuthShell
      brand={BRAND}
      icon={<KeyRound className="h-6 w-6" />}
      title={
        <>
          <StepMarker step={3} />
          Set a new password
        </>
      }
      description={
        <>
          Choose a strong password for{" "}
          <span className="font-medium text-foreground">{email}</span>.
        </>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5">
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem className="animate-brand-fade-up" style={stagger(1)}>
                <FormLabel className={authLabel}>New password</FormLabel>
                <FormControl>
                  <PasswordInput
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem className="animate-brand-fade-up" style={stagger(2)}>
                <FormLabel className={authLabel}>Confirm password</FormLabel>
                <FormControl>
                  <PasswordInput
                    autoComplete="new-password"
                    placeholder="Repeat new password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <SubmitButton
            pending={form.formState.isSubmitting}
            pendingLabel="Resetting password"
            style={stagger(3)}
          >
            Reset password
          </SubmitButton>

          <div className="animate-brand-fade-up flex justify-center pt-2" style={stagger(4)}>
            <button type="button" onClick={onBack} className={linkButton}>
              <ArrowLeft size={14} />
              Back
            </button>
          </div>
        </form>
      </Form>
    </AuthShell>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

type Step = "email" | "otp" | "password"

function ForgotPasswordFlow() {
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")

  if (step === "otp") {
    return (
      <StepOtp
        email={email}
        onNext={(o) => {
          setOtp(o)
          setStep("password")
        }}
        onBack={() => setStep("email")}
      />
    )
  }

  if (step === "password") {
    return <StepNewPassword email={email} otp={otp} onBack={() => setStep("otp")} />
  }

  return (
    <StepEmail
      onNext={(e) => {
        setEmail(e)
        setStep("otp")
      }}
    />
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordFlow />
    </Suspense>
  )
}
