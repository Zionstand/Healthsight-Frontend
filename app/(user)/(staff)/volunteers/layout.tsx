import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Volunteers",
  robots: { index: false, follow: false },
}

export default function VolunteersLayout({ children }: { children: React.ReactNode }) {
  return children
}
