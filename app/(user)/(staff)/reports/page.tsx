"use client"

import { PageHeader } from "@/components/PageHeader"
import { IconReportMedical } from "@tabler/icons-react"

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Clinical summaries and data exports"
      />
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
        <IconReportMedical className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="font-medium text-muted-foreground">Reports coming soon</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Screening summaries, patient statistics, and exports will appear here.
        </p>
      </div>
    </div>
  )
}
