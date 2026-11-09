import React from "react"
import type { Metadata } from "next"
import { LoginForm } from "./_components/LoginForm"

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to Healthsight — the Lagos State Health District I platform for staff, doctors, and administrators.",
  alternates: { canonical: "/" },
}

const Page = () => <LoginForm />

export default Page
