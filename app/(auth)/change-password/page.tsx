"use client"

import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { KeyRound } from "lucide-react"

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

const schema = z
  .object({
    oldPassword: z.string().min(1, "Temporary password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type FormValues = z.infer<typeof schema>

function ChangePasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email") ?? ""

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { oldPassword: "", newPassword: "", confirmPassword: "" },
  })

  async function onSubmit(values: FormValues) {
    try {
      await api.post("/auth/force-change-password", {
        email,
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      })
      toast.success("Password updated. Please sign in with your new password.")
      router.push("/")
    } catch (err) {
      toast.error(apiErrorMessage(err, "Something went wrong"))
    }
  }

  return (
    <AuthShell
      brand={{
        headline: "Secure your account.",
        message:
          "Replace the temporary password you were given with one only you know.",
        note: "Your temporary password stops working once you set a new one.",
      }}
      icon={<KeyRound className="h-6 w-6" />}
      title="Set a new password"
      description={
        <>
          Your account was created with a temporary password. Choose a permanent one to
          continue
          {email && (
            <>
              {" "}
              for <span className="font-medium text-foreground">{email}</span>
            </>
          )}
          .
        </>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5">
          <FormField
            control={form.control}
            name="oldPassword"
            render={({ field }) => (
              <FormItem className="animate-brand-fade-up" style={stagger(1)}>
                <FormLabel className={authLabel}>Temporary password</FormLabel>
                <FormControl>
                  <PasswordInput
                    autoComplete="current-password"
                    placeholder="From your welcome email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem className="animate-brand-fade-up" style={stagger(2)}>
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
              <FormItem className="animate-brand-fade-up" style={stagger(3)}>
                <FormLabel className={authLabel}>Confirm new password</FormLabel>
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
            pendingLabel="Updating password"
            style={stagger(4)}
          >
            Set new password
          </SubmitButton>
        </form>
      </Form>
    </AuthShell>
  )
}

export default function ChangePasswordPage() {
  return (
    <Suspense>
      <ChangePasswordForm />
    </Suspense>
  )
}
