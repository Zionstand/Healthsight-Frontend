"use client"

import { format } from "date-fns"
import { MessageSquare } from "lucide-react"

import { PageHeader } from "@/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useApiQuery } from "@/lib/queries"
import { StatusBadge, humanize } from "@/components/StatusBadge"
import { StatCard } from "@/components/StatCard"
import {
  ListPagination,
  ListToolbar,
  TableState,
} from "@/components/list/ListKit"
import { useListParams } from "@/hooks/use-list-params"

const PAGE_SIZE = 20

type SmsLog = {
  id: string
  phoneNumber: string
  message: string
  smsType: string
  status: string
  sentAt?: string
  createdAt: string
  sentBy?: { firstName: string; lastName: string } | null
}

type SmsStats = {
  total: number
  sent: number
  failed: number
  pending: number
  byType: Record<string, number>
}

const SMS_TYPES = [
  "STAFF_APPROVAL",
  "STAFF_REJECTION",
  "NEW_REGISTRATION",
  "ASSESSMENT_SUBMISSION",
  "ASSESSMENT_DEADLINE_REMINDER",
]

export default function SmsAdminPage() {
  const [params, setParams] = useListParams({ page: 1, type: "", status: "" })
  const filtered = !!(params.type || params.status)

  const { data, isPending: loading } = useApiQuery<{
    data: SmsLog[]
    total: number
    totalPages: number
  }>("/sms", {
    params: { page: params.page, limit: PAGE_SIZE, smsType: params.type, status: params.status },
    keepPrevious: true,
    errorMessage: "Failed to load SMS logs",
  })
  const { data: stats } = useApiQuery<SmsStats>("/sms/stats")
  const logs = data?.data ?? []


  return (
    <div className="space-y-6">
      <PageHeader
        title="SMS logs"
        description="Delivery log for all outbound system SMS messages"
      />

      {/* Stats */}
      {stats ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total sent" value={stats.total} />
          <StatCard label="Delivered" value={stats.sent} color="text-brand-verdant-700 dark:text-brand-verdant-300" />
          <StatCard label="Failed" value={stats.failed} color="text-destructive" />
          <StatCard label="Pending" value={stats.pending} color="text-brand-amber-700 dark:text-brand-amber-300" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      )}

      {/* Type breakdown */}
      {stats?.byType && Object.keys(stats.byType).length > 0 && (
        <div className="rounded-lg border p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">By Type</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats.byType).map(([type, count]) => (
              <div key={type} className="text-sm">
                <span className="text-muted-foreground">{type.replace(/_/g, " ")}: </span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <ListToolbar>
        <Select value={params.type || "all"} onValueChange={(v) => setParams({ type: v === "all" ? "" : v })}>
          <SelectTrigger className="w-full sm:w-56" aria-label="Message type">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {SMS_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{humanize(t)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={params.status || "all"} onValueChange={(v) => setParams({ status: v === "all" ? "" : v })}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="SENT">Sent</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
          </SelectContent>
        </Select>
        {filtered && (
          <Button variant="ghost" size="sm" onClick={() => setParams({ type: "", status: "" })}>
            Clear filters
          </Button>
        )}
      </ListToolbar>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recipient</TableHead>
              <TableHead className="hidden md:table-cell">Type</TableHead>
              <TableHead className="hidden lg:table-cell">Message</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Sent by</TableHead>
              <TableHead className="hidden sm:table-cell">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableState
              loading={loading}
              empty={logs.length === 0}
              columns={6}
              icon={<MessageSquare />}
              title={filtered ? "No messages match these filters" : "No messages sent yet"}
              description={filtered ? "Try another type or status." : "Reminders and alerts the system sends will be logged here."}
            />
            {!loading &&
              logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <p className="font-mono text-sm">{log.phoneNumber}</p>
                      <p className="text-xs text-muted-foreground md:hidden">{humanize(log.smsType)}</p>
                    </TableCell>
                    <TableCell className="hidden text-xs whitespace-nowrap text-muted-foreground md:table-cell">
                      {humanize(log.smsType)}
                    </TableCell>
                    <TableCell className="hidden max-w-[260px] lg:table-cell">
                      <p className="truncate text-sm text-muted-foreground">{log.message}</p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={log.status} />
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                      {log.sentBy ? `${log.sentBy.firstName} ${log.sentBy.lastName}` : "System"}
                    </TableCell>
                    <TableCell className="hidden text-xs whitespace-nowrap text-muted-foreground sm:table-cell">
                      {format(new Date(log.createdAt), "dd MMM yyyy, HH:mm")}
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      <ListPagination
        page={params.page}
        totalPages={data?.totalPages ?? 1}
        total={data?.total ?? 0}
        pageSize={PAGE_SIZE}
        onPageChange={(page) => setParams({ page })}
        noun="message"
      />
    </div>
  )
}

