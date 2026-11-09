"use client"

import Link from "next/link"
import { format } from "date-fns"
import { IconUserPlus, IconUsers } from "@tabler/icons-react"

import { PageHeader } from "@/components/PageHeader"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  LinkRow,
  ListPagination,
  ListToolbar,
  SearchInput,
  TableState,
} from "@/components/list/ListKit"
import { useAuth } from "@/store/useAuth"
import { useApiQuery } from "@/lib/queries"
import { useListParams, useSearchParam } from "@/hooks/use-list-params"

type Patient = {
  id: string
  patientNumber: string
  firstName: string
  lastName: string
  age: number
  gender: "MALE" | "FEMALE"
  phoneNumber?: string
  phc: { id: string; name: string }
  createdAt: string
  _count: { screenings: number; appointments: number }
}

const CAN_REGISTER = [
  "ADMIN",
  "HEALTH_INFORMATION_MANAGEMENT_OFFICER",
  "HEALTH_INFORMATION_MANAGEMENT_TECHNICIAN",
  "HIM_OFFICER",
]

const PAGE_SIZE = 20

export default function PatientsPage() {
  const { user } = useAuth()
  const canRegister = user?.roles?.some((r) => CAN_REGISTER.includes(r.name))

  const [params, setParams] = useListParams({ page: 1, q: "" })
  const [search, setSearch] = useSearchParam(params.q, (q) => setParams({ q }))

  const { data, isPending: loading } = useApiQuery<{
    data: Patient[]
    total: number
    totalPages: number
  }>("/patients", {
    params: { page: params.page, limit: PAGE_SIZE, search: params.q },
    keepPrevious: true,
    errorMessage: "Failed to load patients",
  })
  const patients = data?.data ?? []

  const registerButton = canRegister ? (
    <Button asChild>
      <Link href="/patients/register">
        <IconUserPlus />
        Register patient
      </Link>
    </Button>
  ) : undefined

  return (
    <div className="space-y-5">
      <PageHeader
        title="Patients"
        description="Everyone registered at the facilities you cover."
        action={registerButton}
      />

      <ListToolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, number or phone"
        />
      </ListToolbar>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead className="hidden sm:table-cell">Age</TableHead>
              <TableHead className="hidden md:table-cell">Gender</TableHead>
              <TableHead className="hidden lg:table-cell">Phone</TableHead>
              <TableHead className="text-right">Screenings</TableHead>
              <TableHead className="hidden md:table-cell">Registered</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableState
              loading={loading}
              empty={patients.length === 0}
              columns={6}
              icon={<IconUsers />}
              title={params.q ? `No patients match “${params.q}”` : "No patients yet"}
              description={
                params.q
                  ? "Check the spelling, or search by patient number or phone instead."
                  : "Patients registered at your facility will appear here."
              }
              action={params.q ? (
                <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                  Clear search
                </Button>
              ) : registerButton}
            />
            {!loading &&
              patients.map((p) => (
                <LinkRow key={p.id} href={`/patients/${p.id}`}>
                  <TableCell className="min-w-0 whitespace-normal break-words">
                    <p className="font-medium">
                      {p.firstName} {p.lastName}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {p.patientNumber}
                      <span className="sm:hidden">
                        {" "}· {p.age}y · {p.gender === "FEMALE" ? "F" : "M"}
                      </span>
                    </p>
                  </TableCell>
                  <TableCell className="hidden tabular-nums sm:table-cell">{p.age}</TableCell>
                  <TableCell className="hidden capitalize md:table-cell">
                    {p.gender.toLowerCase()}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {p.phoneNumber ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{p._count.screenings}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {format(new Date(p.createdAt), "dd MMM yyyy")}
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
        noun="patient"
      />
    </div>
  )
}
