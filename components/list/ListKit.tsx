"use client"

import { useRouter } from "next/navigation"
import { IconChevronLeft, IconChevronRight, IconSearch, IconX } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { TableCell, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

// ── Search ───────────────────────────────────────────────────────────────────

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={cn("relative w-full sm:max-w-sm", className)}>
      <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        className="pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) onChange("")
        }}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <IconX className="size-3.5" />
        </button>
      )}
    </div>
  )
}

// ── Toolbar ──────────────────────────────────────────────────────────────────

/** Search on the left, filters to its right; stacks on phones. */
export function ListToolbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center", className)}>
      {children}
    </div>
  )
}

// ── Segmented filter ─────────────────────────────────────────────────────────

/**
 * A short, mutually exclusive filter shown as tabs with counts, e.g.
 * Pending (3) · Rejected (1) · All (4). Use a Select for longer lists.
 */
export function SegmentedFilter<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string; count?: number }[]
  label: string
  className?: string
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("inline-flex w-full rounded-lg border bg-muted/50 p-0.5 sm:w-auto", className)}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors sm:flex-none",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs tabular-nums",
                  active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}
              >
                {o.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── Empty ────────────────────────────────────────────────────────────────────

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center px-4 py-12 text-center", className)}>
      {icon && (
        <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-5">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-balance text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/**
 * The body of a table while it loads or when it has nothing to show.
 * Renders nothing once there are rows, so the caller just maps its data after it.
 */
export function TableState({
  loading,
  empty,
  columns,
  rows = 8,
  ...emptyProps
}: {
  loading: boolean
  empty: boolean
  columns: number
  rows?: number
} & React.ComponentProps<typeof EmptyState>) {
  if (loading)
    return (
      <>
        {Array.from({ length: rows }).map((_, i) => (
          <TableRow key={i} className="hover:bg-transparent" aria-hidden>
            <TableCell colSpan={columns} className="py-3">
              <div className="flex items-center gap-6">
                <div className="w-2/5 space-y-1.5 sm:w-1/4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
                <Skeleton className="hidden h-4 flex-1 sm:block" />
                <Skeleton className="h-4 w-16" />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </>
    )
  if (empty)
    return (
      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={columns} className="p-0">
          <EmptyState {...emptyProps} />
        </TableCell>
      </TableRow>
    )
  return null
}

// ── Rows ─────────────────────────────────────────────────────────────────────

/**
 * A table row that opens `href` when clicked or activated with the keyboard.
 * Clicks on buttons and links inside the row keep their own behaviour.
 */
export function LinkRow({
  href,
  children,
  className,
}: {
  href: string
  children: React.ReactNode
  className?: string
}) {
  const router = useRouter()
  const go = (e: React.MouseEvent | React.KeyboardEvent) => {
    if ((e.target as HTMLElement).closest("a,button,[role=menuitem],input,label")) return
    if ("metaKey" in e && (e.metaKey || e.ctrlKey)) window.open(href, "_blank")
    else router.push(href)
  }
  return (
    <TableRow
      tabIndex={0}
      onClick={go}
      onKeyDown={(e) => e.key === "Enter" && go(e)}
      onMouseEnter={() => router.prefetch(href)}
      className={cn("cursor-pointer focus-visible:bg-muted/60 focus-visible:outline-none", className)}
    >
      {children}
    </TableRow>
  )
}

// ── Pagination ───────────────────────────────────────────────────────────────

export function ListPagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  noun = "result",
}: {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  /** Singular, e.g. "patient". */
  noun?: string
}) {
  if (total === 0) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  return (
    <div className="flex flex-col-reverse items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
      <p className="tabular-nums">
        {totalPages > 1 ? (
          <>
            Showing <span className="font-medium text-foreground">{from.toLocaleString()}</span>–
            <span className="font-medium text-foreground">{to.toLocaleString()}</span> of{" "}
          </>
        ) : null}
        <span className="font-medium text-foreground">{total.toLocaleString()}</span>{" "}
        {total === 1 ? noun : `${noun}s`}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            <IconChevronLeft />
            <span className="hidden sm:inline">Previous</span>
          </Button>
          <span className="px-1 tabular-nums">
            {page} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            <span className="hidden sm:inline">Next</span>
            <IconChevronRight />
          </Button>
        </div>
      )}
    </div>
  )
}
