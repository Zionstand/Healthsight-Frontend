"use client"

import { useRef, useState } from "react"
import { IconArrowsMaximize, IconExternalLink } from "@tabler/icons-react"

import { PageHeader } from "@/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { POWERBI_ASSESSMENT_REPORT_URL } from "@/constants/powerbi"

export function PowerBiReport() {
  const frameWrap = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)

  const goFullscreen = () => {
    frameWrap.current?.requestFullscreen?.().catch(() => {
      window.open(POWERBI_ASSESSMENT_REPORT_URL, "_blank", "noopener,noreferrer")
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessment Analysis"
        description="Assessment results across PHCs and LGAs, from Power BI"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={goFullscreen}>
              <IconArrowsMaximize className="mr-1.5 size-4" />
              Full screen
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={POWERBI_ASSESSMENT_REPORT_URL} target="_blank" rel="noopener noreferrer">
                <IconExternalLink className="mr-1.5 size-4" />
                Open in new tab
              </a>
            </Button>
          </div>
        }
      />

      {/* Power BI reports are laid out at 16:9; the extra height fits its page bar. */}
      <div
        ref={frameWrap}
        className="relative w-full overflow-hidden rounded-lg border bg-card aspect-[16/10] min-h-[420px] [&:fullscreen]:rounded-none [&:fullscreen]:border-0"
      >
        {!loaded && <Skeleton className="absolute inset-0 rounded-none" />}
        <iframe
          title="Assessment Analysis"
          src={POWERBI_ASSESSMENT_REPORT_URL}
          className="absolute inset-0 h-full w-full border-0"
          allowFullScreen
          loading="lazy"
          onLoad={() => setLoaded(true)}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        The report updates on the Power BI refresh schedule, so the newest submissions may take
        a while to appear.
      </p>
    </div>
  )
}
