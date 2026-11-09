import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Appointments",
  robots: { index: false, follow: false },
}

export default function AppointmentsLayout({ children }: { children: React.ReactNode }) {
  return children
}
