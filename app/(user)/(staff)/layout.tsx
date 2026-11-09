import { StaffLayout } from "@/components/StaffLayout"

// One shell for every staff section, so moving between them keeps the sidebar
// mounted instead of rebuilding it on each navigation.
export default function StaffGroupLayout({ children }: { children: React.ReactNode }) {
  return <StaffLayout>{children}</StaffLayout>
}
