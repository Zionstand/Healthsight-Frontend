import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Assessments",
  robots: { index: false, follow: false },
}

export default function AssessmentLayout({ children }: { children: React.ReactNode }) {
  return children
}
