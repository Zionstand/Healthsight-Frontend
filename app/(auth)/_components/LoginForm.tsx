"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Clock } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import api from "@/lib/api"
import { apiErrorMessage, apiErrorStatus } from "@/lib/api-error"
import { useAuth } from "@/store/useAuth"
import { AuthShell, authLabel, stagger } from "./AuthShell"
import { PasswordInput } from "./PasswordInput"
import { SubmitButton } from "./SubmitButton"

const loginSchema = z.object({
  email: z.string().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
})

type LoginValues = z.infer<typeof loginSchema>

/** Only same-site paths, so `?next=` can't send someone to another website. */
function safeNext(next: string | null): string | null {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null
}

const SIGNED_OUT_REASONS: Record<string, string> = {
  expired: "Your session has ended. Please sign in again.",
  inactive: "Your account is no longer active. Please contact an administrator.",
}

export const LoginForm = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setUser } = useAuth()
  const [pendingOpen, setPendingOpen] = useState(false)
  const reason = searchParams.get("reason")
  const next = safeNext(searchParams.get("next"))

  // Say why the person landed here, once.
  useEffect(() => {
    const msg = reason ? SIGNED_OUT_REASONS[reason] : null
    if (msg) toast.info(msg, { id: "signed-out" })
  }, [reason])

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = async (values: LoginValues) => {
    try {
      const { data } = await api.post("/auth/login", {
        email: values.email,
        password: values.password,
      })

      if (data.requiresPasswordChange) {
        router.push(`/change-password?email=${encodeURIComponent(data.email)}`)
        return
      }

      // The session lives in httpOnly cookies now; drop any token an older
      // version of the app left behind.
      localStorage.removeItem("access_token")
      setUser(data.user)

      const isAdmin = data.user.roles?.some((r: { name: string }) => r.name === "ADMIN")
      router.replace(next ?? (isAdmin ? "/admin/dashboard" : "/dashboard"))
    } catch (err) {
      const message = apiErrorMessage(err, "Login failed. Please try again.")
      // The API refuses accounts awaiting approval with a 401 naming the status.
      if (apiErrorStatus(err) === 401 && /PENDING/.test(message)) {
        setPendingOpen(true)
        return
      }
      toast.error(message)
    }
  }

  return (
    <>
      <AuthShell
        brand={{
          headline: "Quality healthcare for every Lagos community.",
          message:
            "Sign in to coordinate care, manage facilities, and serve patients across the district.",
          note: "Secure access for authorized district health staff.",
        }}
        title="Welcome back"
        description="Sign in to access your dashboard."
      >
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-8 space-y-5"
          >
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

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="animate-brand-fade-up" style={stagger(2)}>
                  <div className="flex items-center justify-between">
                    <FormLabel className={authLabel}>Password</FormLabel>
                    <Link
                      href="/forgot-password"
                      className="font-ui text-xs font-medium text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <FormControl>
                    <PasswordInput autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SubmitButton
              pending={form.formState.isSubmitting}
              pendingLabel="Logging in"
              style={stagger(3)}
            >
              Log in
            </SubmitButton>

            <p
              className="animate-brand-fade-up pt-2 text-center font-sans text-sm text-muted-foreground"
              style={stagger(4)}
            >
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-ui font-semibold text-primary hover:underline"
              >
                Sign up
              </Link>
            </p>
          </form>
        </Form>
      </AuthShell>

      <Dialog open={pendingOpen} onOpenChange={setPendingOpen}>
        <DialogContent className="max-w-md text-center">
          <DialogHeader className="items-center">
            <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-brand-amber-100">
              <Clock className="h-7 w-7 text-brand-amber-600" />
            </div>
            <DialogTitle className="font-heading text-lg">
              Account Pending Approval
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm text-muted-foreground">
              Your account has been created successfully but is awaiting
              approval from an administrator. You will be notified once your
              account is activated. Please check back later.
            </DialogDescription>
          </DialogHeader>
          <Button
            variant="outline"
            className="mt-2 w-full"
            onClick={() => setPendingOpen(false)}
          >
            OK, I&apos;ll wait
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
