"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Eye,
  UserPlus,
  Pencil,
  PowerOff,
} from "lucide-react"

import { PageHeader } from "@/components/PageHeader"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import api from "@/lib/api"
import { Users as UsersIcon } from "lucide-react"
import { useApiQuery, useApiState, useInvalidate } from "@/lib/queries"
import { apiErrorMessage } from "@/lib/api-error"
import { StatusBadge } from "@/components/StatusBadge"
import {
  LinkRow,
  ListPagination,
  ListToolbar,
  SearchInput,
  TableState,
} from "@/components/list/ListKit"
import { useListParams, useSearchParam } from "@/hooks/use-list-params"

// ── Types ─────────────────────────────────────────────────────────────────────

type AccountStatus =
  | "ACTIVE"
  | "PENDING"
  | "REJECTED"
  | "SUSPENDED"
  | "DEACTIVATED"

type StaffUser = {
  id: string
  username: string
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  roles: { role: { id: string; name: string; label: string } }[]
  accountStatus: AccountStatus
  createdAt: string
  phc: { id: string; name: string } | null
  lga: { id: string; name: string } | null
  district: { id: string; name: string } | null
}

type Role = { id: string; name: string; label: string; isActive: boolean }
type Location = { id: string; name: string }

// ── Status config ─────────────────────────────────────────────────────────────


// ── Zod schema ────────────────────────────────────────────────────────────────

const staffSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  roleIds: z.array(z.string()).min(1, "At least one role is required"),
  districtId: z.string().optional(),
  lgaId: z.string().optional(),
  phcId: z.string().optional(),
})

type StaffFormValues = z.infer<typeof staffSchema>

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const router = useRouter()

  const [lgas, setLgas] = useState<Location[]>([])
  const [phcs, setPhcs] = useState<Location[]>([])

  const [params, setParams] = useListParams({ page: 1, q: "", status: "ALL" })
  const [search, setSearch] = useSearchParam(params.q, (q) => setParams({ q }))
  const statusFilter = params.status as AccountStatus | "ALL"
  const page = params.page

  const LIMIT = 20

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<StaffUser | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  const [rejectTarget, setRejectTarget] = useState<StaffUser | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [rejectLoading, setRejectLoading] = useState(false)

  const [deactivateTarget, setDeactivateTarget] = useState<StaffUser | null>(
    null
  )
  const [deactivateLoading, setDeactivateLoading] = useState(false)
  const [approveLoading, setApproveLoading] = useState(false)

  // ── Form ───────────────────────────────────────────────────────────────────

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      roleIds: [],
      districtId: undefined,
      lgaId: undefined,
      phcId: undefined,
    },
  })

  // ── Data fetching ──────────────────────────────────────────────────────────

  const invalidate = useInvalidate()
  const usersQ = useApiState<{ data: StaffUser[]; total: number; totalPages: number }>(
    "/admin/users",
    {
      params: {
        page,
        limit: LIMIT,
        search: params.q,
        status: statusFilter === "ALL" ? undefined : statusFilter,
      },
      keepPrevious: true,
      errorMessage: "Failed to load staff",
    }
  )
  const users = usersQ.data?.data ?? []
  const total = usersQ.data?.total ?? 0
  const totalPages = usersQ.data?.totalPages ?? 1
  const loading = usersQ.isPending
  // Show an edit at once, then let the server confirm it (and update counts).
  const setUsers = (fn: (prev: StaffUser[]) => StaffUser[]) => {
    usersQ.setData((prev) => (prev ? { ...prev, data: fn(prev.data) } : prev))
    void invalidate("/admin/users", "/admin/stats")
  }
  const fetchUsers = () => invalidate("/admin/users", "/admin/stats")

  const { data: allRoles } = useApiQuery<Role[]>("/roles/all")
  const roles = useMemo(() => (allRoles ?? []).filter((r) => r.isActive), [allRoles])
  const { data: districts = [] } = useApiQuery<Location[]>("/locations/districts")

  // ── Sheet helpers ──────────────────────────────────────────────────────────

  function openCreate() {
    setEditTarget(null)
    setLgas([])
    setPhcs([])
    form.reset({
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      roleIds: [],
      districtId: undefined,
      lgaId: undefined,
      phcId: undefined,
    })
    setSheetOpen(true)
  }

  function openEdit(user: StaffUser) {
    setEditTarget(user)
    setLgas([])
    setPhcs([])
    if (user.district?.id) {
      api.get(`/locations/districts/${user.district.id}/lgas`).then((res) => {
        setLgas(res.data)
        if (user.lga?.id) {
          api
            .get(`/locations/lgas/${user.lga.id}/phcs`)
            .then((res2) => setPhcs(res2.data))
        }
      })
    }
    form.reset({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      roleIds: user.roles.map((r) => r.role.id),
      districtId: user.district?.id ?? undefined,
      lgaId: user.lga?.id ?? undefined,
      phcId: user.phc?.id ?? undefined,
    })
    setSheetOpen(true)
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function onSubmit(values: StaffFormValues) {
    setFormLoading(true)
    try {
      if (editTarget) {
        await api.patch(`/admin/users/${editTarget.username}`, {
          firstName: values.firstName,
          lastName: values.lastName,
          phoneNumber: values.phoneNumber,
          roleIds: values.roleIds,
          districtId: values.districtId || null,
          lgaId: values.lgaId || null,
          phcId: values.phcId || null,
        })
        setUsers((prev) =>
          prev.map((u) =>
            u.id === editTarget.id
              ? {
                  ...u,
                  firstName: values.firstName,
                  lastName: values.lastName,
                  phoneNumber: values.phoneNumber,
                  roles: values.roleIds.map((id) => ({
                    role: roles.find((r) => r.id === id) ?? {
                      id,
                      name: "",
                      label: "",
                    },
                  })),
                  district:
                    districts.find((d) => d.id === values.districtId) ?? null,
                  lga: lgas.find((l) => l.id === values.lgaId) ?? null,
                  phc: phcs.find((p) => p.id === values.phcId) ?? null,
                }
              : u
          )
        )
        toast.success(`${values.firstName} ${values.lastName} updated`)
      } else {
        await api.post("/admin/users", {
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phoneNumber: values.phoneNumber,
          roleIds: values.roleIds,
          districtId: values.districtId || undefined,
          lgaId: values.lgaId || undefined,
          phcId: values.phcId || undefined,
        })
        await fetchUsers()
        toast.success("Staff account created. Credentials sent to their email.")
      }
      setSheetOpen(false)
    } catch (err) {
      toast.error(apiErrorMessage(err, "Something went wrong"))
    } finally {
      setFormLoading(false)
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  async function handleApprove(user: StaffUser) {
    setApproveLoading(true)
    try {
      await api.patch(`/admin/users/${user.username}/approve`)
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, accountStatus: "ACTIVE" } : u
        )
      )
      toast.success(`${user.firstName} ${user.lastName} approved`)
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to approve"))
    } finally {
      setApproveLoading(false)
    }
  }

  async function handleReject() {
    if (!rejectTarget || !rejectReason.trim()) return
    setRejectLoading(true)
    try {
      await api.patch(`/admin/users/${rejectTarget.username}/reject`, {
        reason: rejectReason.trim(),
      })
      setUsers((prev) =>
        prev.map((u) =>
          u.id === rejectTarget.id ? { ...u, accountStatus: "REJECTED" } : u
        )
      )
      toast.success(
        `${rejectTarget.firstName} ${rejectTarget.lastName} rejected`
      )
      setRejectTarget(null)
      setRejectReason("")
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to reject"))
    } finally {
      setRejectLoading(false)
    }
  }

  async function handleDeactivate() {
    if (!deactivateTarget) return
    setDeactivateLoading(true)
    try {
      await api.patch(`/admin/users/${deactivateTarget.username}/deactivate`)
      setUsers((prev) =>
        prev.map((u) =>
          u.id === deactivateTarget.id
            ? { ...u, accountStatus: "DEACTIVATED" }
            : u
        )
      )
      toast.success(
        `${deactivateTarget.firstName} ${deactivateTarget.lastName} deactivated`
      )
      setDeactivateTarget(null)
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to deactivate"))
    } finally {
      setDeactivateLoading(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        back
        title="Staff"
        description="Create, approve and manage staff accounts."
        action={
          <Button onClick={openCreate}>
            <UserPlus className="mr-2 size-4" />
            Add User
          </Button>
        }
      />

      {/* Filters */}
      <ListToolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email" />
        <Select value={statusFilter} onValueChange={(v) => setParams({ status: v })}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Account status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
            <SelectItem value="DEACTIVATED">Deactivated</SelectItem>
          </SelectContent>
        </Select>
      </ListToolbar>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Role</TableHead>
              <TableHead className="hidden lg:table-cell">Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Joined</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableState
              loading={loading}
              empty={users.length === 0}
              columns={6}
              icon={<UsersIcon />}
              title={params.q || statusFilter !== "ALL" ? "No staff match these filters" : "No staff accounts yet"}
              description={
                params.q || statusFilter !== "ALL"
                  ? "Try a different name, email or status."
                  : "Add staff accounts, or approve people who signed up."
              }
            />
            {!loading &&
              users.map((user) => {
                return (
                  <LinkRow key={user.id} href={`/admin/users/${user.username}`}>
                    <TableCell className="min-w-0 whitespace-normal break-words">
                      <p className="font-medium">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </TableCell>
                    <TableCell className="hidden max-w-56 md:table-cell">
                      <p className="truncate">{user.roles.map((ur) => ur.role.label).join(", ") || "—"}</p>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <p>{user.phc?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {[user.lga?.name, user.district?.name].filter(Boolean).join(" · ")}
                      </p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={user.accountStatus} />
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label={`Actions for ${user.firstName} ${user.lastName}`}
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/admin/users/${user.username}`)
                            }
                          >
                            <Eye className="mr-2 size-4" />
                            View details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(user)}>
                            <Pencil className="mr-2 size-4" />
                            Edit
                          </DropdownMenuItem>

                          {user.accountStatus === "PENDING" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleApprove(user)}
                                disabled={approveLoading}
                                className="text-brand-verdant-600 focus:text-brand-verdant-600"
                              >
                                <CheckCircle className="mr-2 size-4" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setRejectTarget(user)}
                                className="text-destructive focus:text-destructive"
                              >
                                <XCircle className="mr-2 size-4" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}

                          {user.accountStatus !== "DEACTIVATED" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeactivateTarget(user)}
                                className="text-destructive focus:text-destructive"
                              >
                                <PowerOff className="mr-2 size-4" />
                                Deactivate
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </LinkRow>
                )
              })}
          </TableBody>
        </Table>
      </div>

      <ListPagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={LIMIT}
        onPageChange={(page) => setParams({ page })}
        noun="staff account"
      />

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader className="border-b">
            <SheetTitle>{editTarget ? "Edit User" : "Add User"}</SheetTitle>
            <SheetDescription>
              {editTarget
                ? "Update this user's details, roles, and location."
                : "Create a new user account. Login credentials will be emailed to them automatically."}
            </SheetDescription>
          </SheetHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-6 space-y-5 px-4"
            >
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Ada" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Okafor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ada@lagosstate.gov.ng"
                        disabled={!!editTarget}
                        {...field}
                      />
                    </FormControl>
                    {editTarget && (
                      <p className="text-xs text-muted-foreground">
                        Email cannot be changed after account creation.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="08012345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="roleIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role(s)</FormLabel>
                    <div className="max-h-44 space-y-2 overflow-y-auto rounded-md border p-3">
                      {roles.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Loading roles...
                        </p>
                      ) : (
                        roles.map((role) => {
                          const checked = field.value.includes(role.id)
                          return (
                            <div
                              key={role.id}
                              className="flex items-center gap-2"
                            >
                              <Checkbox
                                id={`role-${role.id}`}
                                checked={checked}
                                onCheckedChange={(v) => {
                                  field.onChange(
                                    v
                                      ? [...field.value, role.id]
                                      : field.value.filter(
                                          (id) => id !== role.id
                                        )
                                  )
                                }}
                              />
                              <Label
                                htmlFor={`role-${role.id}`}
                                className="cursor-pointer font-normal"
                              >
                                {role.label}
                              </Label>
                            </div>
                          )
                        })
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="districtId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      District{" "}
                      {/* <span className="text-muted-foreground">(optional)</span> */}
                    </FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(v) => {
                        field.onChange(v || undefined)
                        form.setValue("lgaId", undefined)
                        form.setValue("phcId", undefined)
                        setLgas([])
                        setPhcs([])
                        if (v) {
                          api
                            .get(`/locations/districts/${v}/lgas`)
                            .then((res) => setLgas(res.data))
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select district" />
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
                    <FormLabel>
                      LGA{" "}
                      {/* <span className="text-muted-foreground">(optional)</span> */}
                    </FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(v) => {
                        field.onChange(v || undefined)
                        form.setValue("phcId", undefined)
                        setPhcs([])
                        if (v) {
                          api
                            .get(`/locations/lgas/${v}/phcs`)
                            .then((res) => setPhcs(res.data))
                        }
                      }}
                      disabled={!form.watch("districtId") || lgas.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              !form.watch("districtId")
                                ? "Select district first"
                                : "Select LGA"
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

              <FormField
                control={form.control}
                name="phcId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      PHC{" "}
                      {/* <span className="text-muted-foreground">(optional)</span> */}
                    </FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(v) => field.onChange(v || undefined)}
                      disabled={!form.watch("lgaId") || phcs.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              !form.watch("lgaId")
                                ? "Select LGA first"
                                : "Select PHC"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {phcs.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <SheetFooter className="px-0 pt-2">
                <Button type="submit" disabled={formLoading}>
                  {formLoading
                    ? editTarget
                      ? "Saving..."
                      : "Creating..."
                    : editTarget
                      ? "Save changes"
                      : "Create user"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSheetOpen(false)}
                >
                  Cancel
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* Reject dialog */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null)
            setRejectReason("")
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject User</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting{" "}
              <span className="font-medium text-foreground">
                {rejectTarget?.firstName} {rejectTarget?.lastName}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea
              placeholder="e.g. Incomplete credentials, duplicate account..."
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null)
                setRejectReason("")
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || rejectLoading}
              onClick={handleReject}
            >
              {rejectLoading ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate confirm */}
      <AlertDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => {
          if (!open) setDeactivateTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately log out{" "}
              <span className="font-medium text-foreground">
                {deactivateTarget?.firstName} {deactivateTarget?.lastName}
              </span>{" "}
              and prevent them from signing in. This can be reversed by an
              administrator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
              disabled={deactivateLoading}
              onClick={handleDeactivate}
            >
              {deactivateLoading ? "Deactivating..." : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
