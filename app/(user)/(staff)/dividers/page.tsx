"use client"

import { useState } from "react"
import { toast } from "sonner"
import { format } from "date-fns"
import { useForm } from "react-hook-form"
import { Plus, Trash2, Users } from "lucide-react"

import { PageHeader } from "@/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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

type Divider = {
  id: string
  name: string
  phoneNumber?: string
  lga?: string
  ward?: string
  community?: string
  isActive: boolean
  notes?: string
  createdAt: string
}

export default function DividersPage() {
  const { user } = useAuth()
  const isAdmin = user?.roles?.some((r) => r.name === "ADMIN")
  const [params, setParams] = useListParams({ page: 1, q: "" })
  const [search, setSearch] = useSearchParam(params.q, (q) => setParams({ q }))
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Divider | null>(null)
  const [deleting, setDeleting] = useState<Divider | null>(null)
  const invalidate = useInvalidate()

  const { data, isPending: loading } = useApiQuery<{
    data: Divider[]
    total: number
  }>("/dividers", {
    params: { page: params.page, limit: PAGE_SIZE, search: params.q },
    keepPrevious: true,
    errorMessage: "Failed to load dividers",
  })
  const dividers = data?.data ?? []
  const total = data?.total ?? 0
  const fetchData = () => invalidate("/dividers")

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await api.delete(`/dividers/${deleting.id}`)
      toast.success("Divider deleted")
      setDeleting(null)
      fetchData()
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to delete"))
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dividers"
        description="Community dividers who help mobilise patients for screening."
        action={
          <Button onClick={() => setShowCreate(true)}>
            <Plus />
            Add divider
          </Button>
        }
      />

      <ListToolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, community or ward"
        />
      </ListToolbar>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Phone</TableHead>
              <TableHead className="hidden lg:table-cell">LGA</TableHead>
              <TableHead className="hidden lg:table-cell">Ward</TableHead>
              <TableHead className="hidden sm:table-cell">Community</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Added</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableState
              loading={loading}
              empty={dividers.length === 0}
              columns={8}
              icon={<Users />}
              title={params.q ? `No dividers match “${params.q}”` : "No dividers yet"}
              description={
                params.q ? "Try a different name, community or ward." : "Add the dividers who work with your facility."
              }
              action={
                params.q ? (
                  <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                    Clear search
                  </Button>
                ) : undefined
              }
            />
            {!loading &&
              dividers.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <p className="font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground sm:hidden">{d.community ?? d.phoneNumber ?? ""}</p>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {d.phoneNumber ?? "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{d.lga ?? "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">{d.ward ?? "—"}</TableCell>
                  <TableCell className="hidden sm:table-cell">{d.community ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge
                      status={d.isActive ? "ACTIVE" : "INACTIVE"}
                      label={d.isActive ? "Active" : "Inactive"}
                    />
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                    {format(new Date(d.createdAt), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditing(d)}
                      >
                        Edit
                      </Button>
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          aria-label={`Delete ${d.name}`}
                          onClick={() => setDeleting(d)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
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
        noun="divider"
      />

      <DividerSheet
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSaved={() => {
          setShowCreate(false)
          fetchData()
        }}
      />
      {editing && (
        <DividerSheet
          open
          divider={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            fetchData()
          }}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Divider?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleting?.name}</strong>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function DividerSheet({
  open,
  divider,
  onClose,
  onSaved,
}: {
  open: boolean
  divider?: Divider
  onClose: () => void
  onSaved: () => void
}) {
  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      name: divider?.name ?? "",
      phoneNumber: divider?.phoneNumber ?? "",
      lga: divider?.lga ?? "",
      ward: divider?.ward ?? "",
      community: divider?.community ?? "",
      notes: divider?.notes ?? "",
      isActive: divider?.isActive ?? true,
    },
  })
  const [saving, setSaving] = useState(false)

  const onSubmit = async (data: any) => {
    setSaving(true)
    try {
      if (divider) {
        await api.patch(`/dividers/${divider.id}`, data)
        toast.success("Divider updated")
      } else {
        await api.post("/dividers", data)
        toast.success("Divider added")
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
          <SheetTitle>{divider ? "Edit Divider" : "Add Divider"}</SheetTitle>
        </SheetHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="container mt-6 space-y-4"
        >
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input {...register("name")} required />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input {...register("phoneNumber")} />
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
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea {...register("notes")} rows={2} />
          </div>
          {divider && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="isActive"
                checked={watch("isActive")}
                onCheckedChange={(v) => setValue("isActive", !!v)}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          )}
          <SheetFooter className="px-0 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
