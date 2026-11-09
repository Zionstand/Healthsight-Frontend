"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Building2, Plus, Pencil, Trash2, Map as MapIcon, MapPin, X } from "lucide-react"
import Link from "next/link"

const PhcMapPicker = dynamic(
  () => import("./_components/PhcMapPicker"),
  { ssr: false, loading: () => <div className="h-52 w-full rounded-md bg-muted animate-pulse" /> }
)
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"

import { PageHeader } from "@/components/PageHeader"
import { Input } from "@/components/ui/input"
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
  SheetDescription,
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import api from "@/lib/api"
import { useApiQuery, useApiState, useInvalidate } from "@/lib/queries"
import { apiErrorMessage } from "@/lib/api-error"
import { StatusBadge } from "@/components/StatusBadge"
import {
  ListPagination,
  ListToolbar,
  SearchInput,
  TableState,
} from "@/components/list/ListKit"
import { useListParams, useSearchParam } from "@/hooks/use-list-params"

// ── Types ────────────────────────────────────────────────────────────────────

type Phc = {
  id: string
  name: string
  address: string | null
  latitude: number | null
  longitude: number | null
  createdAt: string
  lga: { id: string; name: string; district: { id: string; name: string } }
  _count: { users: number }
}

type Location = { id: string; name: string }

// ── Zod schema ───────────────────────────────────────────────────────────────

const phcSchema = z.object({
  name: z.string().min(1, "PHC name is required"),
  districtId: z.string().min(1, "District is required"),
  lgaId: z.string().min(1, "LGA is required"),
  address: z.string().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
})

type PhcFormValues = z.infer<typeof phcSchema>

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

// ── PHC Form Sheet ────────────────────────────────────────────────────────────

function PhcFormSheet({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Phc | null
  onSaved: (phc: Phc) => void
}) {
  const { data: districts = [] } = useApiQuery<Location[]>("/locations/districts")
  const [lgas, setLgas] = useState<Location[]>([])
  const [loadingLgas, setLoadingLgas] = useState(false)

  const form = useForm<PhcFormValues>({
    resolver: zodResolver(phcSchema),
    defaultValues: { name: "", districtId: "", lgaId: "", address: "", latitude: null, longitude: null },
  })

  // Populate form when editing
  useEffect(() => {
    if (open && editing) {
      form.reset({
        name: editing.name,
        districtId: editing.lga.district.id,
        lgaId: editing.lga.id,
        address: editing.address ?? "",
        latitude: editing.latitude ?? null,
        longitude: editing.longitude ?? null,
      })
      // Pre-load LGAs for the editing district
      setLoadingLgas(true)
      api
        .get(`/locations/districts/${editing.lga.district.id}/lgas`)
        .then((res) => setLgas(res.data))
        .finally(() => setLoadingLgas(false))
    } else if (open && !editing) {
      form.reset({ name: "", districtId: "", lgaId: "", address: "", latitude: null, longitude: null })
      setLgas([])
    }
  }, [open, editing]) // eslint-disable-line react-hooks/exhaustive-deps


  async function handleDistrictChange(districtId: string) {
    form.setValue("districtId", districtId)
    form.setValue("lgaId", "")
    setLgas([])
    setLoadingLgas(true)
    try {
      const res = await api.get(`/locations/districts/${districtId}/lgas`)
      setLgas(res.data)
    } finally {
      setLoadingLgas(false)
    }
  }

  async function onSubmit(values: PhcFormValues) {
    try {
      const payload = {
        name: values.name,
        lgaId: values.lgaId,
        address: values.address || null,
        latitude: values.latitude ?? null,
        longitude: values.longitude ?? null,
      }
      const res = editing
        ? await api.patch(`/admin/phcs/${editing.id}`, payload)
        : await api.post("/admin/phcs", payload)

      // Backend returns the PHC without _count — attach it
      const saved: Phc = {
        ...res.data,
        _count: editing ? editing._count : { users: 0 },
      }
      onSaved(saved)
      toast.success(editing ? "PHC updated" : "PHC created")
      onOpenChange(false)
    } catch (err) {
      toast.error(apiErrorMessage(err, "Something went wrong"))
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>{editing ? "Edit PHC" : "Add New PHC"}</SheetTitle>
          <SheetDescription>
            {editing
              ? "Update the name or location of this Primary Health Care centre."
              : "Fill in the details to register a new Primary Health Care centre."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-5 px-4 py-6"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PHC Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Ipaja PHC" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="districtId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>District</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={handleDistrictChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select District" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {districts.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lgaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Local Government Area</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!form.watch("districtId") || loadingLgas}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            loadingLgas ? "Loading..." : "Select LGA"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {lgas.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 2 Balogun Road, Agege" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location picker */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium leading-none">
                  Map Location <span className="text-muted-foreground font-normal">(optional)</span>
                </p>
                {(form.watch("latitude") != null) && (
                  <button
                    type="button"
                    onClick={() => { form.setValue("latitude", null); form.setValue("longitude", null) }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" /> Clear pin
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Click on the map to drop a pin.</p>
              <PhcMapPicker
                lat={form.watch("latitude") ?? null}
                lng={form.watch("longitude") ?? null}
                onChange={(lat, lng) => {
                  form.setValue("latitude", lat)
                  form.setValue("longitude", lng)
                }}
              />
              {form.watch("latitude") != null && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 text-primary" />
                  {form.watch("latitude")?.toFixed(5)}, {form.watch("longitude")?.toFixed(5)}
                </p>
              )}
            </div>

            <SheetFooter className="mt-2 px-0">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? editing
                    ? "Saving..."
                    : "Creating..."
                  : editing
                    ? "Save Changes"
                    : "Create PHC"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}

/// ── Page ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25

export default function AdminPhcsPage() {
  const invalidate = useInvalidate()
  const {
    data: phcData,
    setData: setPhcData,
    isPending: loading,
  } = useApiState<Phc[]>("/admin/phcs", { errorMessage: "Failed to load PHCs" })
  const phcs = phcData ?? []
  // Edit in place, then refresh the PHC lists other screens use (map, sign-up).
  const setPhcs = (fn: (prev: Phc[]) => Phc[]) => {
    setPhcData((prev) => fn(prev ?? []))
    void invalidate("/locations/phcs", "/admin/stats")
  }

  const [params, setParams] = useListParams({ page: 1, q: "", lga: "", district: "" })
  const [search, setSearch] = useSearchParam(params.q, (q) => setParams({ q }))

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Phc | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<Phc | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const districts = Array.from(
    new Map(phcs.map((p) => [p.lga.district.id, p.lga.district.name])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]))
  const lgas = Array.from(
    new Map(
      phcs
        .filter((p) => !params.district || p.lga.district.id === params.district)
        .map((p) => [p.lga.id, p.lga.name])
    ).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]))

  const term = params.q.trim().toLowerCase()
  const filtered = phcs
    .filter((p) => {
      const matchesSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.lga.name.toLowerCase().includes(term) ||
        (p.address ?? "").toLowerCase().includes(term)
      return (
        matchesSearch &&
        (!params.district || p.lga.district.id === params.district) &&
        (!params.lga || p.lga.id === params.lga)
      )
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(params.page, totalPages)
  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const filtering = !!term || !!params.lga || !!params.district

  function openEditor(phc: Phc | null) {
    setEditing(phc)
    setSheetOpen(true)
  }

  function handleSaved(saved: Phc) {
    setPhcs((prev) => {
      const exists = prev.find((p) => p.id === saved.id)
      if (exists) return prev.map((p) => (p.id === saved.id ? saved : p))
      return [saved, ...prev]
    })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await api.delete(`/admin/phcs/${deleteTarget.id}`)
      setPhcs((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      toast.success(`${deleteTarget.name} deleted`)
      setDeleteTarget(null)
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't delete this PHC"))
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        back
        title="PHCs"
        description="The primary health centres staff are assigned to and assessments are recorded for."
        action={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/admin/phcs/map">
                <MapIcon />
                <span className="hidden sm:inline">Map view</span>
              </Link>
            </Button>
            <Button onClick={() => openEditor(null)}>
              <Plus />
              Add PHC
            </Button>
          </div>
        }
      />

      <ListToolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, LGA or address" />
        {/* Only worth showing once there is more than one district. */}
        {districts.length > 1 && (
          <Select
            value={params.district || "ALL"}
            onValueChange={(v) => setParams({ district: v === "ALL" ? "" : v, lga: "" })}
          >
            <SelectTrigger className="w-full sm:w-44" aria-label="District">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All districts</SelectItem>
              {districts.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select
          value={params.lga || "ALL"}
          onValueChange={(v) => setParams({ lga: v === "ALL" ? "" : v })}
        >
          <SelectTrigger className="w-full sm:w-56" aria-label="Local government">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All local governments</SelectItem>
            {lgas.map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ListToolbar>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PHC</TableHead>
              <TableHead className="hidden md:table-cell">Local government</TableHead>
              <TableHead className="hidden sm:table-cell">Staff</TableHead>
              <TableHead className="hidden lg:table-cell">Map</TableHead>
              <TableHead className="hidden lg:table-cell">Added</TableHead>
              <TableHead className="w-24">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableState
              loading={loading}
              empty={filtered.length === 0}
              columns={6}
              icon={<Building2 />}
              title={filtering ? "No PHCs match these filters" : "No PHCs yet"}
              description={
                filtering
                  ? "Try a different name, or another local government."
                  : "Add the primary health centres in your district."
              }
              action={
                filtering ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch("")
                      setParams({ q: "", lga: "", district: "" })
                    }}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => openEditor(null)}>
                    <Plus />
                    Add PHC
                  </Button>
                )
              }
            />
            {!loading &&
              shown.map((phc) => (
                <TableRow
                  key={phc.id}
                  tabIndex={0}
                  className="cursor-pointer focus-visible:bg-muted/60 focus-visible:outline-none"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("a,button")) return
                    openEditor(phc)
                  }}
                  onKeyDown={(e) => e.key === "Enter" && e.target === e.currentTarget && openEditor(phc)}
                >
                  <TableCell className="min-w-0 whitespace-normal break-words">
                    <p className="font-medium">{phc.name}</p>
                    <p className="text-xs text-muted-foreground md:hidden">
                      {phc.lga.name} · {phc._count.users} staff
                    </p>
                    {phc.address && (
                      <p className="hidden max-w-xs truncate text-xs text-muted-foreground md:block">
                        {phc.address}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <p>{phc.lga.name}</p>
                    <p className="text-xs text-muted-foreground">{phc.lga.district.name}</p>
                  </TableCell>
                  <TableCell className="hidden tabular-nums sm:table-cell">
                    {phc._count.users > 0 ? (
                      phc._count.users
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {phc.latitude != null ? (
                      <StatusBadge status="PINNED" label="Pinned" tone="success" />
                    ) : (
                      <StatusBadge status="NO_PIN" label="No pin" tone="neutral" />
                    )}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {formatDate(phc.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={`Edit ${phc.name}`}
                        onClick={() => openEditor(phc)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        aria-label={`Delete ${phc.name}`}
                        onClick={() => setDeleteTarget(phc)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <ListPagination
        page={page}
        totalPages={totalPages}
        total={filtered.length}
        pageSize={PAGE_SIZE}
        onPageChange={(p) => setParams({ page: p })}
        noun="PHC"
      />

      {/* Create / Edit Sheet */}
      <PhcFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editing={editing}
        onSaved={handleSaved}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This can&apos;t be undone. PHCs with staff assigned can&apos;t be deleted; move the
              staff first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteLoading ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
