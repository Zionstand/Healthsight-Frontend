"use client"

import Link from "next/link"
import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"

/** Friendly stand-in for a screen that crashed, with a way forward. */
export function ErrorState({
  reset,
  digest,
  homeHref = "/",
}: {
  reset: () => void
  digest?: string
  homeHref?: string
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <IconAlertTriangle className="size-7" />
      </div>
      <h1 className="mt-5 text-xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This screen hit an unexpected problem. Your saved work is safe. Try again, and if it
        keeps happening, tell an administrator what you were doing.
      </p>
      {digest && (
        <p className="mt-3 font-mono text-xs text-muted-foreground">Reference: {digest}</p>
      )}
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>
          <IconRefresh />
          Try again
        </Button>
        <Button variant="outline" asChild>
          <Link href={homeHref}>Go to dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
