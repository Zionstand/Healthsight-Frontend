import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Dividers",
  robots: { index: false, follow: false },
}

export default function DividersLayout({ children }: { children: React.ReactNode }) {
  return children
}
