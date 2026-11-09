"use client"

import { useEffect } from "react"
import { ErrorState } from "@/components/shell/ErrorState"

export default function StaffError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => console.error(error), [error])
  return <ErrorState reset={reset} digest={error.digest} homeHref="/dashboard" />
}
