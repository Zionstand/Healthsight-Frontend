import type { Metadata } from "next"
import { StaffLayout } from "@/components/StaffLayout"

export const metadata: Metadata = {
  title: "Assessment Analysis",
  robots: { index: false, follow: false },
}

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return <StaffLayout>{children}</StaffLayout>
}
