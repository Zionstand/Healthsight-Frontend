"use client"

import { useRef, useState } from "react"
import { IconArrowsMaximize, IconExternalLink, IconLock } from "@tabler/icons-react"

import { PageHeader } from "@/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import api from "@/lib/api"
import { useApiQuery } from "@/lib/queries"
import { apiErrorStatus } from "@/lib/api-error"

type State =
  | { status: "loading" }
  | { status: "ready"; url: string }
  | { status: "forbidden" }
  | { status: "error" }

// The report link is served by the backend to directors and admins only
// (GET /analytics/powerbi), so it never ships in the public JS bundle.
export function PowerBiReport() {
  const frameWrap = useRef<HTMLDivElement>(null)
  const [frameLoaded, setFrameLoaded] = useState(false)
  // This screen shows its own "no access" and error states, so no toast.
  const report = useApiQuery<{ url: string }>("/analytics/powerbi", { silent: true })
  const state: State = report.data
    ? { status: "ready", url: report.data.url }
    : report.isError
      ? { status: apiErrorStatus(report.error) === 403 ? "forbidden" : "error" }
      : { status: "loading" }

  const url = state.status === "ready" ? state.url : null

  const goFullscreen = () => {
    if (!url) return
    frameWrap.current?.requestFullscreen?.().catch(() => {
      window.open(url, "_blank", "noopener,noreferrer")
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessment Analysis"
        description="Assessment results across PHCs and LGAs, from Power BI"
        action={
          url && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={goFullscreen}>
                <IconArrowsMaximize className="mr-1.5 size-4" />
                Full screen
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <IconExternalLink className="mr-1.5 size-4" />
                  Open in new tab
                </a>
              </Button>
            </div>
          )
        }
      />

      {state.status === "forbidden" && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
          <IconLock className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">Directors and admins only</p>
          <p className="mt-1 text-sm text-muted-foreground">
            You don&apos;t have access to the assessment analytics.
          </p>
        </div>
      )}

      {state.status === "error" && (
        <div className="rounded-lg border border-dashed py-20 text-center text-sm text-muted-foreground">
          Couldn&apos;t load the report. Please refresh the page or try again later.
        </div>
      )}

      {(state.status === "loading" || url) && (
        // Power BI reports are laid out at 16:9; the extra height fits its page bar.
        <div
          ref={frameWrap}
          className="relative w-full overflow-hidden rounded-lg border bg-card aspect-[16/10] min-h-[420px] [&:fullscreen]:rounded-none [&:fullscreen]:border-0"
        >
          {!frameLoaded && <Skeleton className="absolute inset-0 rounded-none" />}
          {url && (
            <iframe
              title="Assessment Analysis"
              src={url}
              className="absolute inset-0 h-full w-full border-0"
              allowFullScreen
              referrerPolicy="no-referrer"
              onLoad={() => setFrameLoaded(true)}
            />
          )}
        </div>
      )}

      {url && (
        <p className="text-xs text-muted-foreground">
          The report updates on the Power BI refresh schedule, so the newest submissions may
          take a while to appear.
        </p>
      )}
    </div>
  )
}
