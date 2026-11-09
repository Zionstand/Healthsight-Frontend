import type { Metadata } from "next"
import Link from "next/link"
import { IconArrowLeft, IconMapSearch } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/Logo"

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 text-center">
      <Logo />
      <div className="mt-10 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <IconMapSearch className="size-7" />
      </div>
      <p className="mt-5 text-sm font-medium text-primary">404</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">We couldn&apos;t find that page</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The link may be out of date, or the page may have moved. Check the address, or head
        back to your dashboard.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">
          <IconArrowLeft />
          Back to Healthsight
        </Link>
      </Button>
    </main>
  )
}
