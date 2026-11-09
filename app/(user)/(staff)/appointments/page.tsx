"use client"

import { useState } from "react"
import { toast } from "sonner"
import { format } from "date-fns"
import { useForm } from "react-hook-form"
import { Plus, CalendarDays } from "lucide-react"

import { PageHeader } from "@/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/store/useAuth"
import api from "@/lib/api"
import { useApiQuery, useInvalidate } from "@/lib/queries"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { apiErrorMessage } from "@/lib/api-error"
import { StatusBadge, statusLabel } from "@/components/StatusBadge"
import {
  ListPagination,
  ListToolbar,
  TableState,
} from "@/components/list/ListKit"
import { useListParams } from "@/hooks/use-list-params"

const CAN_MANAGE_APPOINTMENTS = [
  "ADMIN",
  "HEALTH_INFORMATION_MANAGEMENT_OFFICER",
  "HEALTH_INFORMATION_MANAGEMENT_TECHNICIAN",
  "HIM_OFFICER",
  "MEDICAL_OFFICER",
  "CONSULTANT",
  "OBSTETRICIAN",
  "OPHTHALMOLOGIST",
  "OPTOMETRIST",
  "DENTIST",
  "DOCTOR",
  "NURSE",
  "MIDWIFE",
  "WARD_NURSE",
  "DENTAL_NURSE",
  "EMERGENCY_CARE_STAFF",
  "EMERGENCY_MEDICAL_TECHNICIAN",
]

const PAGE_SIZE = 20

type Appointment = {
  id: string
  scheduledDate: string
  status: string
  notes?: string
  patient: { id: string; firstName: string; lastName: string; patientNumber: string; phoneNumber?: string }
  screening?: { id: string; screeningNumber: string; screeningType: string } | null
  createdBy: { firstName: string; lastName: string }
}


export default function AppointmentsPage() {
  const { user } = useAuth()
  const [params, setParams] = useListParams({ page: 1, status: "" })
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Appointment | null>(null)
  const invalidate = useInvalidate()

  const canManage = user?.roles?.some((r) => CAN_MANAGE_APPOINTMENTS.includes(r.name))

  const { data, isPending: loading } = useApiQuery<{
    data: Appointment[]
    total: number
    totalPages: number
  }>("/appointments", {
    params: { page: params.page, limit: PAGE_SIZE, status: params.status },
    keepPrevious: true,
    errorMessage: "Failed to load appointments",
  })
  const appointments = data?.data ?? []
  // After a save: refresh the list and the dashboard's appointment stats.
  const fetchData = () => invalidate("/appointments", "/appointments/stats")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        description="Follow-ups and visits booked for your patients."
        action={
          canManage ? (
            <Button onClick={() => setShowCreate(true)}>
              <Plus />
              Schedule appointment
            </Button>
          ) : undefined
        }
      />

      <ListToolbar>
        <Select
          value={params.status || "all"}
          onValueChange={(v) => setParams({ status: v === "all" ? "" : v })}
        >
          <SelectTrigger className="w-full sm:w-44" aria-label="Status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {["SCHEDULED", "COMPLETED", "MISSED", "CANCELLED"].map((s) => (
              <SelectItem key={s} value={s}>
                {statusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ListToolbar>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Date & time</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="hidden md:table-cell">Screening</TableHead>
              <TableHead className="hidden lg:table-cell">Notes</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableState
              loading={loading}
              empty={appointments.length === 0}
              columns={6}
              icon={<CalendarDays />}
              title={params.status ? `No ${statusLabel(params.status).toLowerCase()} appointments` : "No appointments yet"}
              description={
                params.status
                  ? "Try another status, or show all appointments."
                  : "Appointments scheduled for your patients will appear here."
              }
              action={
                params.status ? (
                  <Button variant="outline" size="sm" onClick={() => setParams({ status: "" })}>
                    Show all
                  </Button>
                ) : undefined
              }
            />
            {!loading &&
              appointments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <p className="font-medium">{a.patient.firstName} {a.patient.lastName}</p>
                      <p className="text-xs text-muted-foreground">{a.patient.patientNumber}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{format(new Date(a.scheduledDate), "dd MMM yyyy")}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(a.scheduledDate), "HH:mm")}</p>
                      <StatusBadge status={a.status} className="mt-1 sm:hidden" />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <StatusBadge status={a.status} />
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                      {a.screening ? `${a.screening.screeningType.replace(/_/g, " ")}` : "—"}
                    </TableCell>
                    <TableCell className="hidden max-w-[200px] truncate text-xs text-muted-foreground lg:table-cell">
                      {a.notes ?? "—"}
                    </TableCell>
                    <TableCell>
                      {canManage && (
                        <Button size="sm" variant="ghost" onClick={() => setEditing(a)}>Edit</Button>
                      )}
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
        noun="appointment"
      />

      {/* Create sheet */}
      <AppointmentSheet
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSaved={() => { setShowCreate(false); fetchData() }}
      />

      {/* Edit sheet */}
      {editing && (
        <AppointmentSheet
          open
          appointment={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); fetchData() }}
        />
      )}
    </div>
  )
}

function PatientSearch({ onSelect }: { onSelect: (id: string, label: string) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState("")
  const term = useDebouncedValue(query.trim(), 300)
  const { data, isFetching } = useApiQuery<{
    data: { id: string; firstName: string; lastName: string; patientNumber: string }[]
  }>(term.length >= 2 ? "/patients" : null, { params: { search: term, limit: 10 } })
  const results = term.length >= 2 ? (data?.data ?? []) : []

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start font-normal text-left">
          {selected || <span className="text-muted-foreground">Search patient by name or number…</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[320px]" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Type name or patient number…" value={query} onValueChange={setQuery} />
          <CommandList>
            {results.length === 0 && term.length >= 2 && !isFetching && <CommandEmpty>No patients found.</CommandEmpty>}
            <CommandGroup>
              {results.map((p) => (
                <CommandItem
                  key={p.id}
                  onSelect={() => {
                    const label = `${p.firstName} ${p.lastName} (${p.patientNumber})`
                    setSelected(label)
                    onSelect(p.id, label)
                    setOpen(false)
                  }}
                >
                  <span className="font-medium">{p.firstName} {p.lastName}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{p.patientNumber}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function AppointmentSheet({ open, appointment, onClose, onSaved }: {
  open: boolean
  appointment?: Appointment
  onClose: () => void
  onSaved: () => void
}) {
  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      patientId: "",
      scheduledDate: appointment ? format(new Date(appointment.scheduledDate), "yyyy-MM-dd'T'HH:mm") : "",
      notes: appointment?.notes ?? "",
      status: appointment?.status ?? "SCHEDULED",
    },
  })
  const [saving, setSaving] = useState(false)
  const status = watch("status")

  const onSubmit = async (data: any) => {
    if (!appointment && !data.patientId) {
      toast.error("Please select a patient")
      return
    }
    setSaving(true)
    try {
      if (appointment) {
        await api.patch(`/appointments/${appointment.id}`, { scheduledDate: data.scheduledDate, notes: data.notes, status: data.status })
      } else {
        await api.post("/appointments", { patientId: data.patientId, scheduledDate: data.scheduledDate, notes: data.notes })
      }
      toast.success(appointment ? "Appointment updated" : "Appointment scheduled")
      reset()
      onSaved()
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{appointment ? "Edit Appointment" : "Schedule Appointment"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          {!appointment && (
            <div className="space-y-1.5">
              <Label>Patient *</Label>
              <PatientSearch onSelect={(id) => setValue("patientId", id)} />
            </div>
          )}
          {appointment && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setValue("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["SCHEDULED", "COMPLETED", "MISSED", "CANCELLED"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Date & Time *</Label>
            <Input {...register("scheduledDate")} type="datetime-local" required />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea {...register("notes")} rows={3} />
          </div>
          <SheetFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
