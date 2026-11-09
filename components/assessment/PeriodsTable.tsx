"use client"

import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { CalendarRange, Eye, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/StatusBadge"
import { LinkRow, TableState } from "@/components/list/ListKit"

export type PeriodRow = {
  id: string
  title: string
  description?: string | null
  status: "DRAFT" | "ACTIVE" | "CLOSED" | string
  startDate: string
  endDate: string
  _count: { questions: number; submissions: number }
}

type Status = "DRAFT" | "ACTIVE" | "CLOSED"

/**
 * Assessment periods, shared by the General and SafeCare admin screens. A row
 * opens the period's results; edits and status changes sit in its menu.
 */
export function PeriodsTable<P extends PeriodRow>({
  periods,
  resultsHref,
  onCreate,
  onEdit,
  onStatusChange,
  onDelete,
  withTime = false,
  emptyDescription = "Create a period to open an assessment to staff.",
}: {
  periods: P[]
  resultsHref: (p: P) => string
  onCreate: () => void
  onEdit: (p: P) => void
  onStatusChange: (id: string, status: Status) => void
  onDelete: (p: P) => void
  /** Show times as well as dates. */
  withTime?: boolean
  emptyDescription?: string
}) {
  const router = useRouter()
  const fmt = (d: string) => format(new Date(d), withTime ? "dd MMM yyyy, HH:mm" : "dd MMM yyyy")
  const short = (d: string) => format(new Date(d), "dd MMM yyyy")

  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Period</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Opens</TableHead>
            <TableHead className="hidden md:table-cell">Closes</TableHead>
            <TableHead className="hidden text-right lg:table-cell">Questions</TableHead>
            <TableHead className="hidden text-right sm:table-cell">Submissions</TableHead>
            <TableHead className="w-12">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableState
            loading={false}
            empty={periods.length === 0}
            columns={7}
            icon={<CalendarRange />}
            title="No assessment periods yet"
            description={emptyDescription}
            action={
              <Button size="sm" onClick={onCreate}>
                <Plus />
                New period
              </Button>
            }
          />
          {periods.map((p) => (
            <LinkRow key={p.id} href={resultsHref(p)}>
              <TableCell className="min-w-0 whitespace-normal break-words">
                <p className="font-medium">{p.title}</p>
                {p.description && (
                  <p className="line-clamp-1 max-w-md text-xs text-muted-foreground">{p.description}</p>
                )}
                {/* Phones: dates and counts in one line under the title. */}
                <p className="mt-0.5 text-xs text-muted-foreground md:hidden">
                  {short(p.startDate)} – {short(p.endDate)}
                  <span className="sm:hidden"> · {p._count.submissions} submissions</span>
                </p>
              </TableCell>
              <TableCell>
                <StatusBadge status={p.status} />
              </TableCell>
              <TableCell className="hidden text-sm whitespace-nowrap md:table-cell">{fmt(p.startDate)}</TableCell>
              <TableCell className="hidden text-sm whitespace-nowrap md:table-cell">{fmt(p.endDate)}</TableCell>
              <TableCell className="hidden text-right tabular-nums lg:table-cell">{p._count.questions}</TableCell>
              <TableCell className="hidden text-right tabular-nums sm:table-cell">{p._count.submissions}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${p.title}`}>
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(resultsHref(p))}>
                      <Eye /> View results
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(p)}>
                      <Pencil /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {p.status === "DRAFT" && (
                      <DropdownMenuItem onClick={() => onStatusChange(p.id, "ACTIVE")}>
                        Open to staff
                      </DropdownMenuItem>
                    )}
                    {p.status === "ACTIVE" && (
                      <DropdownMenuItem onClick={() => onStatusChange(p.id, "CLOSED")}>
                        Close period
                      </DropdownMenuItem>
                    )}
                    {p.status === "CLOSED" && (
                      <DropdownMenuItem onClick={() => onStatusChange(p.id, "ACTIVE")}>
                        Reopen period
                      </DropdownMenuItem>
                    )}
                    {p.status === "DRAFT" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => onDelete(p)}>
                          <Trash2 /> Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </LinkRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
