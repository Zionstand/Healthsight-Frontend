import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Reset password",
  description:
    "Reset your Healthsight password to regain access to the Lagos State Health District I platform.",
  // A utility page: reachable from sign-in, but nothing worth ranking.
  robots: { index: false, follow: true },
}

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
