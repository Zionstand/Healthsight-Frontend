"use client"

import { useState } from "react"
import { Pencil, Plus, PowerOff, Power, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { isPrivilegedRole } from "@/constants/roles"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import api from "@/lib/api"
import { useApiState } from "@/lib/queries"
import { apiErrorMessage } from "@/lib/api-error"
import { StatusBadge } from "@/components/StatusBadge"
import { ListToolbar, SearchInput, SegmentedFilter, TableState } from "@/components/list/ListKit"
import { useListParams, useSearchParam } from "@/hooks/use-list-params"

type Role = {
  id: string
  name: string
  label: string
  description: string | null
  isAvailableForRegistration: boolean
  isActive: boolean
  _count: { userRoles: number }
  createdAt: string
}

type FormState = {
  label: string
  description: string
  isAvailableForRegistration: boolean
}

const EMPTY_FORM: FormState = {
  label: "",
  description: "",
  isAvailableForRegistration: true,
}

export default function AdminRolesPage() {
  const {
    data: rolesData,
    setData: setRolesData,
    isPending: loading,
  } = useApiState<Role[]>("/roles/all", { errorMessage: "Failed to load roles" })
  const roles = rolesData ?? []
  const setRoles = (fn: (prev: Role[]) => Role[]) => setRolesData((prev) => fn(prev ?? []))
  const [params, setParams] = useListParams({ q: "", status: "ALL" })
  const [search, setSearch] = useSearchParam(params.q, (q) => setParams({ q }))
  const status = params.status as "ALL" | "ACTIVE" | "INACTIVE"

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Role | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [toggleTarget, setToggleTarget] = useState<Role | null>(null)
  const [toggling, setToggling] = useState(false)


  const term = params.q.trim().toLowerCase()
  const filtered = roles
    .filter(
      (r) =>
        (!term ||
          r.label.toLowerCase().includes(term) ||
          r.name.toLowerCase().includes(term) ||
          (r.description ?? "").toLowerCase().includes(term)) &&
        (status === "ALL" || (status === "ACTIVE" ? r.isActive : !r.isActive))
    )
    .sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.label.localeCompare(b.label))
  const counts = {
    ALL: roles.length,
    ACTIVE: roles.filter((r) => r.isActive).length,
    INACTIVE: roles.filter((r) => !r.isActive).length,
  }

  function openCreate() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setSheetOpen(true)
  }

  function openEdit(role: Role) {
    setEditTarget(role)
    setForm({
      label: role.label,
      description: role.description ?? "",
      isAvailableForRegistration: role.isAvailableForRegistration,
    })
    setSheetOpen(true)
  }

  async function handleSave() {
    if (!form.label.trim()) return
    setSaving(true)
    try {
      if (editTarget) {
        const { data } = await api.patch(`/roles/${editTarget.id}`, {
          label: form.label.trim(),
          description: form.description.trim() || null,
          isAvailableForRegistration: isPrivilegedRole(editTarget.name)
            ? false
            : form.isAvailableForRegistration,
        })
        setRoles((prev) =>
          prev.map((r) => (r.id === editTarget.id ? { ...r, ...data } : r))
        )
        toast.success("Role updated")
      } else {
        const { data } = await api.post("/roles", {
          label: form.label.trim(),
          description: form.description.trim() || null,
          isAvailableForRegistration: form.isAvailableForRegistration,
        })
        setRoles((prev) => [data, ...prev])
        toast.success("Role created")
      }
      setSheetOpen(false)
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to save role"))
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle() {
    if (!toggleTarget) return
    setToggling(true)
    try {
      const endpoint = toggleTarget.isActive
        ? `/roles/${toggleTarget.id}/deactivate`
        : `/roles/${toggleTarget.id}/activate`
      await api.patch(endpoint)
      setRoles((prev) =>
        prev.map((r) =>
          r.id === toggleTarget.id ? { ...r, isActive: !r.isActive } : r
        )
      )
      toast.success(
        `"${toggleTarget.label}" ${toggleTarget.isActive ? "deactivated" : "activated"}`
      )
      setToggleTarget(null)
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update role status"))
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        back
        title="Roles"
        description="Staff roles, who holds them, and which ones people can choose when they sign up."
        action={
          <Button onClick={openCreate}>
            <Plus />
            Add role
          </Button>
        }
      />

      <ListToolbar className="sm:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Search roles" />
        <SegmentedFilter
          label="Status"
          value={status}
          onChange={(v) => setParams({ status: v })}
          options={[
            { value: "ALL", label: "All", count: counts.ALL },
            { value: "ACTIVE", label: "Active", count: counts.ACTIVE },
            { value: "INACTIVE", label: "Inactive", count: counts.INACTIVE },
          ]}
        />
      </ListToolbar>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead className="hidden md:table-cell">Sign-up</TableHead>
              <TableHead className="hidden sm:table-cell">Staff</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableState
              loading={loading}
              empty={filtered.length === 0}
              columns={5}
              icon={<ShieldCheck />}
              title={term || status !== "ALL" ? "No roles match these filters" : "No roles yet"}
              description={term ? "Try a different name or description." : undefined}
              action={
                term ? (
                  <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                    Clear search
                  </Button>
                ) : undefined
              }
            />
            {!loading &&
              filtered.map((role) => {
                const privileged = isPrivilegedRole(role.name)
                return (
                  <TableRow
                    key={role.id}
                    tabIndex={0}
                    className="cursor-pointer focus-visible:bg-muted/60 focus-visible:outline-none"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest("a,button")) return
                      openEdit(role)
                    }}
                    onKeyDown={(e) => e.key === "Enter" && e.target === e.currentTarget && openEdit(role)}
                  >
                    <TableCell className={`min-w-0 whitespace-normal break-words ${!role.isActive ? "text-muted-foreground" : ""}`}>
                      <p className="font-medium">{role.label}</p>
                      <p className="line-clamp-2 max-w-md text-xs break-all text-muted-foreground sm:break-normal">
                        {role.description || <span className="font-mono">{role.name}</span>}
                      </p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {privileged ? (
                        <StatusBadge status="ADMIN_ONLY" label="Admin assigns" tone="info" />
                      ) : role.isAvailableForRegistration ? (
                        <StatusBadge status="OPEN" label="Open" tone="success" />
                      ) : (
                        <StatusBadge status="RESTRICTED" label="Restricted" tone="neutral" />
                      )}
                    </TableCell>
                    <TableCell className="hidden tabular-nums sm:table-cell">
                      {role._count?.userRoles ?? 0}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={role.isActive ? "ACTIVE" : "INACTIVE"} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => openEdit(role)}
                          aria-label={`Edit ${role.label}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-foreground"
                          onClick={() => setToggleTarget(role)}
                          aria-label={`${role.isActive ? "Deactivate" : "Activate"} ${role.label}`}
                        >
                          {role.isActive ? <PowerOff className="size-4" /> : <Power className="size-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
          </TableBody>
        </Table>
      </div>

      {/* Create / Edit Sheet */}
      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) setSheetOpen(false)
        }}
      >
        <SheetContent className="sm:max-w-md">
          <SheetHeader className="border-b">
            <SheetTitle>{editTarget ? "Edit role" : "Add role"}</SheetTitle>
            <SheetDescription>
              {editTarget
                ? "Update the role details below."
                : "Create a new role for staff members."}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 px-4 py-6">
            <div className="space-y-2">
              <Label htmlFor="role-label">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="role-label"
                autoFocus
                placeholder="e.g. Ward Nurse"
                value={form.label}
                onChange={(e) =>
                  setForm((f) => ({ ...f, label: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-description">Description</Label>
              <Textarea
                id="role-description"
                placeholder="Optional description..."
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">
                  Available for Registration
                </p>
                <p className="text-xs text-muted-foreground">
                  {isPrivilegedRole(editTarget?.name)
                    ? "Administrative role — can only be assigned by an admin"
                    : "Allow staff to select this role during sign-up"}
                </p>
              </div>
              <Switch
                checked={
                  isPrivilegedRole(editTarget?.name)
                    ? false
                    : form.isAvailableForRegistration
                }
                disabled={isPrivilegedRole(editTarget?.name)}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, isAvailableForRegistration: v }))
                }
              />
            </div>
          </div>

          <SheetFooter className="px-4">
            <Button
              onClick={handleSave}
              disabled={!form.label.trim() || saving}
            >
              {saving
                ? "Saving..."
                : editTarget
                  ? "Save changes"
                  : "Create role"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setSheetOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Activate / Deactivate confirmation */}
      <AlertDialog
        open={!!toggleTarget}
        onOpenChange={(open) => {
          if (!open) setToggleTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget?.isActive ? "Deactivate" : "Activate"} Role
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.isActive ? (
                <>
                  Deactivating <strong>{toggleTarget?.label}</strong> will hide
                  it from the registration form. Existing users with this role
                  are unaffected.
                </>
              ) : (
                <>
                  Activating <strong>{toggleTarget?.label}</strong> will make it
                  available again in the registration form (if registration is
                  enabled for it).
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={toggling}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggle}
              disabled={toggling}
              className={
                toggleTarget?.isActive
                  ? "text-destructive-foreground bg-destructive hover:bg-destructive/90"
                  : ""
              }
            >
              {toggling
                ? "Updating..."
                : toggleTarget?.isActive
                  ? "Deactivate"
                  : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
