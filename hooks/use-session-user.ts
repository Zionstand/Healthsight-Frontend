"use client"

import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import { useAuth, type User } from "@/store/useAuth"

type MeResponse = Omit<NonNullable<User>, "roles"> & {
  roles: { role: { id: string; name: string; label: string } }[]
}

/**
 * The signed-in user for the app shell.
 *
 * proxy.ts already guarantees a session cookie on private pages, so this never
 * blanks the screen: it shows the remembered profile straight away and checks
 * it against /auth/me once per page load. If the cookie now belongs to someone
 * else (a different account signed in from another tab, say), the remembered
 * profile is replaced, so the shell, name and admin/staff routing follow the
 * real session rather than whoever used this browser last.
 */
export function useSessionUser() {
  const { user, _hasHydrated, setUser } = useAuth()

  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => (await api.get<MeResponse>("/auth/me")).data,
    enabled: _hasHydrated,
    staleTime: Infinity,
    meta: { silent: true },
  })

  useEffect(() => {
    if (!me.data) return
    const fresh = { ...me.data, roles: me.data.roles.map((r) => r.role) }
    if (!user || !sameSession(user, fresh)) setUser(fresh)
  }, [me.data, user, setUser])

  // A remembered profile that disagrees with the server is not shown at all.
  const confirmed =
    !me.data ||
    (!!user &&
      sameSession(user, {
        ...me.data,
        roles: me.data.roles.map((r) => r.role),
      }))
  const ready = _hasHydrated && !!user && confirmed
  // Routing between the admin and staff areas waits for the server's answer
  // (or its failure, in which case the remembered profile stands).
  const verified = ready && (!!me.data || me.isError)
  return { user, ready, verified }
}

function sameSession(a: NonNullable<User>, b: NonNullable<User>) {
  const names = (u: NonNullable<User>) =>
    (u.roles ?? [])
      .map((r) => r.name)
      .sort()
      .join(",")
  return a.id === b.id && names(a) === names(b)
}

export const isAdmin = (user: User) =>
  !!user?.roles?.some((r) => r.name === "ADMIN")
