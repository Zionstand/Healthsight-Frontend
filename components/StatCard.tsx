import Link from "next/link"
import { cn } from "@/lib/utils"

/**
 * One number with a label. Used for every summary tile so they line up and
 * read the same across dashboards.
 */
export function StatCard({
  label,
  value,
  icon,
  hint,
  href,
  bg,
  color,
  className,
}: {
  label: string
  value: number | string
  icon?: React.ReactNode
  /** Small line under the number, e.g. "+12 this month". */
  hint?: React.ReactNode
  /** Makes the whole tile a link to the full list. */
  href?: string
  /** Extra classes for the tile, e.g. a tinted background. */
  bg?: string
  /** Colour for the number, e.g. "text-destructive". */
  color?: string
  className?: string
}) {
  const body = (
    <>
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={cn("mt-2 text-2xl font-semibold tracking-tight tabular-nums", color)}>
        {typeof value === "number" ? value.toLocaleString("en-NG") : value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </>
  )
  const classes = cn("rounded-xl border bg-card p-4", bg, className)
  if (href)
    return (
      <Link
        href={href}
        className={cn(
          classes,
          "block transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        )}
      >
        {body}
      </Link>
    )
  return <div className={classes}>{body}</div>
}
