"use client"

import { useState } from "react"
import { toast } from "sonner"
import { format } from "date-fns"
import { useForm } from "react-hook-form"
import { HeartHandshake, Plus } from "lucide-react"

import { PageHeader } from "@/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
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
import api from "@/lib/api"
import { useApiQuery, useInvalidate } from "@/lib/queries"
import { apiErrorMessage } from "@/lib/api-error"
import {
  ListPagination,
  ListToolbar,
  SearchInput,
  TableState,
} from "@/components/list/ListKit"
import { useListParams, useSearchParam } from "@/hooks/use-list-params"
import { StatusBadge } from "@/components/StatusBadge"

const PAGE_SIZE = 20

type Volunteer = {
  id: string
  firstName: string
  lastName: string
  phoneNumber?: string
  gender?: string
  age?: number
  lga?: string
  ward?: string
  community?: string
  status: "ACTIVE" | "INACTIVE"
  trainingCompleted: boolean
  trainingDate?: string
  notes?: string
  createdAt: string
}

export default function VolunteersPage() {
  const [params, setParams] = useListParams({ page: 1, q: "", status: "" })
  const [search, setSearch] = useSearchParam(params.q, (q) => setParams({ q }))
  const filtered = !!(params.q || params.status)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Volunteer | null>(null)
  const invalidate = useInvalidate()

  const { data, isPending: loading } = useApiQuery<{
    data: Volunteer[]
    total: number
  }>("/volunteers", {
    params: { page: params.page, limit: PAGE_SIZE, search: params.q, status: params.status },
    keepPrevious: true,
    errorMessage: "Failed to load volunteers",
  })
  const volunteers = data?.data ?? []
  const total = data?.total ?? 0
  const fetchData = () => invalidate("/volunteers")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Volunteers"
        description="Community volunteers supporting outreach and follow-up."
        action={
          <Button onClick={() => setShowCreate(true)}>
            <Plus />
            Add volunteer
          </Button>
        }
      />

      <ListToolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or community" />
        <Select
          value={params.status || "all"}
          onValueChange={(v) => setParams({ status: v === "all" ? "" : v })}
        >
          <SelectTrigger className="w-full sm:w-40" aria-label="Status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </ListToolbar>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Phone</TableHead>
              <TableHead className="hidden lg:table-cell">Gender</TableHead>
              <TableHead className="hidden sm:table-cell">Community</TableHead>
              <TableHead className="hidden md:table-cell">Training</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Added</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableState
              loading={loading}
              empty={volunteers.length === 0}
              columns={8}
              icon={<HeartHandshake />}
              title={filtered ? "No volunteers match these filters" : "No volunteers yet"}
              description={filtered ? "Try a different search or status." : "Add the volunteers who support your facility."}
              action={
                filtered ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch("")
                      setParams({ q: "", status: "" })
                    }}
                  >
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
            {!loading &&
              volunteers.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <p className="font-medium">
                      {v.firstName} {v.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground sm:hidden">{v.community ?? v.phoneNumber ?? ""}</p>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {v.phoneNumber ?? "—"}
                  </TableCell>
                  <TableCell className="hidden capitalize lg:table-cell">{v.gender?.toLowerCase() ?? "—"}</TableCell>
                  <TableCell className="hidden sm:table-cell">{v.community ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <StatusBadge
                      status={v.trainingCompleted ? "COMPLETED" : "PENDING"}
                      label={v.trainingCompleted ? "Trained" : "Not yet"}
                    />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={v.status} />
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                    {format(new Date(v.createdAt), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing(v)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <ListPagination
        page={params.page}
        totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={(page) => setParams({ page })}
        noun="volunteer"
      />

      <VolunteerSheet
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSaved={() => {
          setShowCreate(false)
          fetchData()
        }}
      />
      {editing && (
        <VolunteerSheet
          open
          volunteer={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            fetchData()
          }}
        />
      )}
    </div>
  )
}

function VolunteerSheet({
  open,
  volunteer,
  onClose,
  onSaved,
}: {
  open: boolean
  volunteer?: Volunteer
  onClose: () => void
  onSaved: () => void
}) {
  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      firstName: volunteer?.firstName ?? "",
      lastName: volunteer?.lastName ?? "",
      phoneNumber: volunteer?.phoneNumber ?? "",
      gender: volunteer?.gender ?? "",
      age: volunteer?.age ?? "",
      lga: volunteer?.lga ?? "",
      ward: volunteer?.ward ?? "",
      community: volunteer?.community ?? "",
      status: volunteer?.status ?? "ACTIVE",
      trainingCompleted: volunteer?.trainingCompleted ?? false,
      trainingDate: volunteer?.trainingDate
        ? format(new Date(volunteer.trainingDate), "yyyy-MM-dd")
        : "",
      notes: volunteer?.notes ?? "",
    },
  })
  const [saving, setSaving] = useState(false)
  const gender = watch("gender")
  const status = watch("status")

  const onSubmit = async (data: any) => {
    setSaving(true)
    try {
      const payload: any = { ...data }
      if (!payload.age) delete payload.age
      if (!payload.trainingDate) delete payload.trainingDate
      if (!payload.gender) delete payload.gender

      if (volunteer) {
        await api.patch(`/volunteers/${volunteer.id}`, payload)
        toast.success("Volunteer updated")
      } else {
        await api.post("/volunteers", payload)
        toast.success("Volunteer added")
      }
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
      <SheetContent className="overflow-y-auto">
        <SheetHeader className="border-b">
          <SheetTitle>
            {volunteer ? "Edit Volunteer" : "Add Volunteer"}
          </SheetTitle>
        </SheetHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="container mt-6 space-y-4"
        >
          <div className="space-y-1.5">
            <Label>First Name *</Label>
            <Input {...register("firstName")} required />
          </div>
          <div className="space-y-1.5">
            <Label>Last Name *</Label>
            <Input {...register("lastName")} required />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input {...register("phoneNumber")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select
                value={gender}
                onValueChange={(v) => setValue("gender", v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Age</Label>
              <Input {...register("age")} type="number" min={0} max={120} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>LGA</Label>
            <Input {...register("lga")} />
          </div>
          <div className="space-y-1.5">
            <Label>Ward</Label>
            <Input {...register("ward")} />
          </div>
          <div className="space-y-1.5">
            <Label>Community</Label>
            <Input {...register("community")} />
          </div>
          {volunteer && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) =>
                  setValue("status", v as "ACTIVE" | "INACTIVE")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Checkbox
              id="training"
              checked={watch("trainingCompleted")}
              onCheckedChange={(v) => setValue("trainingCompleted", !!v)}
            />
            <Label htmlFor="training">Training Completed</Label>
          </div>
          {watch("trainingCompleted") && (
            <div className="space-y-1.5">
              <Label>Training Date</Label>
              <Input {...register("trainingDate")} type="date" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea {...register("notes")} rows={2} />
          </div>
          <SheetFooter className="px-0 pt-4">
            <Button
              className="w-full"
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button className="w-full" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
