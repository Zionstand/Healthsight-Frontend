import { cn } from "@/lib/utils"

export type Tone = "success" | "warning" | "danger" | "info" | "neutral"

const TONES: Record<Tone, string> = {
  success:
    "bg-brand-verdant-100 text-brand-verdant-800 ring-brand-verdant-600/20 dark:bg-brand-verdant-900/40 dark:text-brand-verdant-300",
  warning:
    "bg-brand-amber-100 text-brand-amber-800 ring-brand-amber-600/20 dark:bg-brand-amber-900/40 dark:text-brand-amber-300",
  danger:
    "bg-brand-crimson-100 text-brand-crimson-800 ring-brand-crimson-600/20 dark:bg-brand-crimson-900/40 dark:text-brand-crimson-300",
  info: "bg-brand-sky-100 text-brand-sky-800 ring-brand-sky-600/20 dark:bg-brand-sky-900/40 dark:text-brand-sky-300",
  neutral: "bg-muted text-muted-foreground ring-border",
}

/**
 * Every status the app shows, in one place, so "Pending" looks the same on the
 * users list, the approvals queue and a profile. Unknown values fall back to a
 * neutral badge with a tidied label.
 */
const STATUSES: Record<string, { label: string; tone: Tone }> = {
  // Accounts
  ACTIVE: { label: "Active", tone: "success" },
  PENDING: { label: "Pending", tone: "warning" },
  REJECTED: { label: "Rejected", tone: "danger" },
  SUSPENDED: { label: "Suspended", tone: "neutral" },
  DEACTIVATED: { label: "Deactivated", tone: "neutral" },
  INACTIVE: { label: "Inactive", tone: "neutral" },
  BANNED: { label: "Banned", tone: "danger" },
  // Assessment periods
  DRAFT: { label: "Draft", tone: "neutral" },
  CLOSED: { label: "Closed", tone: "neutral" },
  // Screenings
  IN_PROGRESS: { label: "In progress", tone: "info" },
  COMPLETED: { label: "Completed", tone: "success" },
  REFERRED: { label: "Referred", tone: "warning" },
  // Appointments
  SCHEDULED: { label: "Scheduled", tone: "info" },
  MISSED: { label: "Missed", tone: "danger" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
  // SMS
  SENT: { label: "Sent", tone: "success" },
  DELIVERED: { label: "Delivered", tone: "success" },
  FAILED: { label: "Failed", tone: "danger" },
  QUEUED: { label: "Queued", tone: "neutral" },
}

/** "IN_PROGRESS" -> "In progress" */
export function humanize(value: string) {
  const s = value.replace(/_/g, " ").toLowerCase()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function statusLabel(status: string) {
  return STATUSES[status]?.label ?? humanize(status)
}

export function StatusBadge({
  status,
  label,
  tone,
  className,
}: {
  status: string
  /** Override the standard label, e.g. "Open" for an ACTIVE period. */
  label?: string
  tone?: Tone
  className?: string
}) {
  const known = STATUSES[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        TONES[tone ?? known?.tone ?? "neutral"],
        className
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current opacity-70" />
      {label ?? known?.label ?? humanize(status)}
    </span>
  )
}
