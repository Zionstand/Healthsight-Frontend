import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Screenings",
  robots: { index: false, follow: false },
}

export default function ScreeningsLayout({ children }: { children: React.ReactNode }) {
  return children
}
