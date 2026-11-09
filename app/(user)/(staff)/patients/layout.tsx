import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Patients",
  robots: { index: false, follow: false },
}

export default function PatientsLayout({ children }: { children: React.ReactNode }) {
  return children
}
