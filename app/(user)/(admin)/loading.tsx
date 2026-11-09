import { PageSkeleton } from "@/components/shell/ShellSkeleton"

// Shown inside the app frame the instant a link is clicked, while the next
// screen loads.
export default function Loading() {
  return <PageSkeleton />
}
