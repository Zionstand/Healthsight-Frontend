import type { Metadata } from "next"
import { RegisterForm } from "./_components/RegisterForm"

export const metadata: Metadata = {
  title: "Create an account",
  description:
    "Register for a Healthsight account to join the Lagos State Health District I platform.",
  alternates: { canonical: "/register" },
}

const page = () => <RegisterForm />

export default page
