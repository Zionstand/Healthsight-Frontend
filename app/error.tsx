"use client"

import { useEffect } from "react"
import { ErrorState } from "@/components/shell/ErrorState"

// Catches crashes outside the signed-in app frame (e.g. the sign-in screens).
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => console.error(error), [error])
  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <ErrorState reset={reset} digest={error.digest} />
    </main>
  )
}
