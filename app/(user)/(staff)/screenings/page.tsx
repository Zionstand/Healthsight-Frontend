"use client"

import Link from "next/link"
import { format } from "date-fns"
import { IconPlus, IconStethoscope } from "@tabler/icons-react"

import { getScreeningLabel } from "@/lib/screening-labels"
import { PageHeader } from "@/components/PageHeader"
import { Button } from "@/components/ui/button"
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
import { useListParams, useSearchParam } from "@/hooks/use-list-params"
import {
  LinkRow,
  ListPagination,
  ListToolbar,
  SearchInput,
  TableState,
} from "@/components/list/ListKit"
import { StatusBadge, statusLabel } from "@/components/StatusBadge"

type Screening = {
  id: string
  screeningNumber: string
  screeningType: string
  status: string
  createdAt: string
  patient: { id: string; firstName: string; lastName: string; patientNumber: string; gender: string; age: number }
  conductedBy: { firstName: string; lastName: string }
  assessedBy?: { firstName: string; lastName: string } | null
  vitals: { id: string } | null
}

const STATUS_OPTIONS = ["PENDING", "IN_PROGRESS", "COMPLETED", "REFERRED"]
const TYPE_OPTIONS = ["HYPERTENSION", "DIABETES", "CERVICAL_CANCER", "BREAST_CANCER", "PSA"]


const PAGE_SIZE = 20

export default function ScreeningsPage() {
  const [params, setParams] = useListParams({ page: 1, q: "", type: "", status: "" })
  const [search, setSearch] = useSearchParam(params.q, (q) => setParams({ q }))
  const filtered = !!(params.q || params.type || params.status)

  const { data, isPending: loading } = useApiQuery<{
    data: Screening[]
    total: number
    totalPages: number
  }>("/screenings", {
    params: {
      page: params.page,
      limit: PAGE_SIZE,
      search: params.q,
      type: params.type,
      status: params.status,
    },
    keepPrevious: true,
    errorMessage: "Failed to load screenings",
  })
  const screenings = data?.data ?? []

  const clearFilters = () => {
    setSearch("")
    setParams({ q: "", type: "", status: "" })
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Screenings"
        description="Screenings carried out at the facilities you cover."
        action={
          <Button asChild>
            <Link href="/patients">
              <IconPlus />
              New screening
            </Link>
          </Button>
        }
      />

      <ListToolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by patient or screening number"
        />
        <Select
          value={params.type || "all"}
          onValueChange={(v) => setParams({ type: v === "all" ? "" : v })}
        >
          <SelectTrigger className="w-full sm:w-44" aria-label="Screening type">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {TYPE_OPTIONS.map((t) => (
              <SelectItem key={t} value={t}>
                {getScreeningLabel(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={params.status || "all"}
          onValueChange={(v) => setParams({ status: v === "all" ? "" : v })}
        >
          <SelectTrigger className="w-full sm:w-40" aria-label="Status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {statusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filtered && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </ListToolbar>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead className="hidden sm:table-cell">Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Vitals</TableHead>
              <TableHead className="hidden md:table-cell">Date</TableHead>
              <TableHead className="hidden lg:table-cell">Conducted by</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableState
              loading={loading}
              empty={screenings.length === 0}
              columns={6}
              icon={<IconStethoscope />}
              title={filtered ? "No screenings match these filters" : "No screenings yet"}
              description={
                filtered
                  ? "Try a different search, or clear the filters."
                  : "Start a screening from a patient's record."
              }
              action={
                filtered ? (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
            {!loading &&
              screenings.map((s) => (
                <LinkRow key={s.id} href={`/screenings/${s.id}`}>
                  <TableCell className="min-w-0 whitespace-normal break-words">
                    <p className="font-medium">
                      {s.patient.firstName} {s.patient.lastName}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {s.screeningNumber}
                      <span className="sm:hidden"> · {getScreeningLabel(s.screeningType)}</span>
                    </p>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {getScreeningLabel(s.screeningType)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={s.status} />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {s.vitals ? (
                      <span className="text-brand-verdant-700 dark:text-brand-verdant-300">Recorded</span>
                    ) : (
                      <span className="text-muted-foreground">Not yet</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {format(new Date(s.createdAt), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {s.conductedBy.firstName} {s.conductedBy.lastName}
                  </TableCell>
                </LinkRow>
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
        noun="screening"
      />
    </div>
  )
}
