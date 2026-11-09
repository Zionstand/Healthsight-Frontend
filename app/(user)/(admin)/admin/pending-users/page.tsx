"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Check,
  Loader2,
  UserCheck,
  X,
} from "lucide-react"

import { PageHeader } from "@/components/PageHeader"
import { Button } from "@/components/ui/button"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import api from "@/lib/api"
import { useApiQuery, useInvalidate } from "@/lib/queries"
import { apiErrorMessage } from "@/lib/api-error"
import {
  LinkRow,
  ListPagination,
  ListToolbar,
  SearchInput,
  SegmentedFilter,
  TableState,
} from "@/components/list/ListKit"
import { useListParams, useSearchParam } from "@/hooks/use-list-params"

// ── Types ─────────────────────────────────────────────────────────────────────

type AccountStatus = "PENDING" | "REJECTED"

type PendingUser = {
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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

const COLUMNS = 5
const PAGE_SIZE = 20

type Paged<T> = { data: T[]; total: number; page: number; totalPages: number }

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PendingUsersPage() {
  const invalidate = useInvalidate()

  // The queue is what admins come here for, so it opens on Pending.
  const [params, setParams] = useListParams({ q: "", status: "PENDING", page: 1 })
  const [search, setSearch] = useSearchParam(params.q, (q) => setParams({ q }))
  const status: AccountStatus = params.status === "REJECTED" ? "REJECTED" : "PENDING"

  // The server filters and pages; this screen only ever shows one status.
  const { data, isPending: loading } = useApiQuery<Paged<PendingUser>>("/admin/users", {
    params: { status, search: params.q, page: params.page, limit: PAGE_SIZE },
    keepPrevious: true,
    errorMessage: "Failed to load sign-ups",
  })
  // Tab counts: one row each is enough to read the total.
  const { data: pendingCount } = useApiQuery<Paged<PendingUser>>("/admin/users", {
    params: { status: "PENDING", limit: 1 },
    silent: true,
  })
  const { data: rejectedCount } = useApiQuery<Paged<PendingUser>>("/admin/users", {
    params: { status: "REJECTED", limit: 1 },
    silent: true,
  })
  // Rows acted on in this visit disappear at once, before the refetch lands.
  const [handled, setHandled] = useState<Set<string>>(new Set())
  const users = (data?.data ?? []).filter((u) => !handled.has(u.id))
  const refresh = (id: string) => {
    setHandled((prev) => new Set(prev).add(id))
    void invalidate("/admin/users", "/admin/stats")
  }

  const [rejectTarget, setRejectTarget] = useState<PendingUser | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [rejectLoading, setRejectLoading] = useState(false)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  async function handleApprove(user: PendingUser) {
    setApprovingId(user.id)
    try {
      await api.patch(`/admin/users/${user.username}/approve`)
      refresh(user.id)
      toast.success(`${user.firstName} ${user.lastName} approved`, {
        description: "They can sign in now.",
      })
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't approve this account"))
    } finally {
      setApprovingId(null)
    }
  }

  async function handleReject() {
    if (!rejectTarget || !rejectReason.trim()) return
    setRejectLoading(true)
    try {
      await api.patch(`/admin/users/${rejectTarget.username}/reject`, {
        reason: rejectReason.trim(),
      })
      refresh(rejectTarget.id)
      toast.success(`${rejectTarget.firstName} ${rejectTarget.lastName} rejected`)
      setRejectTarget(null)
      setRejectReason("")
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't reject this account"))
    } finally {
      setRejectLoading(false)
    }
  }

  const term = params.q.trim()
  const filtered = users

  const emptyTitle = term
    ? "No sign-ups match your search"
    : status === "PENDING"
      ? "You're all caught up"
      : "No rejected sign-ups"
  const emptyDescription = term
    ? "Try a different name or email."
    : status === "PENDING"
      ? "New staff who sign up will appear here for approval."
      : undefined

  return (
    <div className="space-y-4">
      <PageHeader
        back
        title="Pending approvals"
        description="Staff who signed up themselves. Approve them to let them sign in."
      />

      <ListToolbar className="sm:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email" />
        <SegmentedFilter
          label="Status"
          value={status}
          onChange={(v) => setParams({ status: v })}
          options={[
            { value: "PENDING", label: "Pending", count: pendingCount?.total },
            { value: "REJECTED", label: "Rejected", count: rejectedCount?.total },
          ]}
        />
      </ListToolbar>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Role</TableHead>
              <TableHead className="hidden lg:table-cell">Location</TableHead>
              <TableHead className="hidden sm:table-cell">Signed up</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableState
              loading={loading}
              empty={filtered.length === 0}
              columns={COLUMNS}
              rows={6}
              icon={<UserCheck />}
              title={emptyTitle}
              description={emptyDescription}
              action={
                term ? (
                  <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                    Clear search
                  </Button>
                ) : undefined
              }
            />
            {!loading &&
              filtered.map((user) => {
                const role = user.roles.map((ur) => ur.role.label).join(", ") || "—"
                const pending = user.accountStatus === "PENDING"
                const approving = approvingId === user.id
                return (
                  <LinkRow key={user.id} href={`/admin/users/${user.username}`}>
                    <TableCell className="min-w-0 whitespace-normal break-words">
                      <p className="font-medium">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      {/* On phones the other columns are hidden; keep the essentials here. */}
                      <p className="mt-0.5 text-xs text-muted-foreground md:hidden">
                        {[role, user.phc?.name].filter(Boolean).join(" · ")}
                      </p>
                    </TableCell>
                    <TableCell className="hidden max-w-56 md:table-cell">
                      <p className="truncate">{role}</p>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <p>{user.phc?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {[user.lga?.name, user.district?.name].filter(Boolean).join(" · ")}
                      </p>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {pending && (
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setRejectTarget(user)}
                            disabled={approving}
                            aria-label={`Reject ${user.firstName} ${user.lastName}`}
                          >
                            <X />
                            <span className="hidden xl:inline">Reject</span>
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(user)}
                            disabled={approving}
                            aria-label={`Approve ${user.firstName} ${user.lastName}`}
                          >
                            {approving ? <Loader2 className="animate-spin" /> : <Check />}
                            <span className="hidden xl:inline">Approve</span>
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </LinkRow>
                )
              })}
          </TableBody>
        </Table>
      </div>

      <ListPagination
        page={params.page}
        totalPages={data?.totalPages ?? 1}
        total={data?.total ?? 0}
        pageSize={PAGE_SIZE}
        onPageChange={(page) => setParams({ page })}
        noun="sign-up"
      />

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
            <DialogTitle>Reject sign-up</DialogTitle>
            <DialogDescription>
              Say why you are rejecting{" "}
              <span className="font-medium text-foreground">
                {rejectTarget?.firstName} {rejectTarget?.lastName}
              </span>
              . They may be told this reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Reason</Label>
            <Textarea
              id="reject-reason"
              placeholder="e.g. Incomplete credentials, duplicate account…"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              autoFocus
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
              {rejectLoading && <Loader2 className="animate-spin" />}
              {rejectLoading ? "Rejecting…" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
