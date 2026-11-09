import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios"
import { useAuth } from "@/store/useAuth"
import { queryClient } from "./query-client"

/**
 * Browser calls go to /api on this site, which next.config rewrites to the
 * backend. That keeps the httpOnly auth cookies first-party, so no token ever
 * touches JavaScript and nothing needs attaching to requests by hand.
 */
const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
})

// Calls that must never trigger a refresh or a sign-out.
const AUTH_ROUTES = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/verify-otp",
  "/auth/reset-password",
  "/auth/force-change-password",
  "/auth/refresh",
  "/auth/logout",
]
const isAuthRoute = (url = "") => AUTH_ROUTES.some((r) => url.includes(r))

// One refresh at a time; concurrent 401s wait for the same attempt.
let refreshing: Promise<boolean> | null = null
function refreshSession() {
  refreshing ??= api
    .post("/auth/refresh")
    .then(() => true)
    .catch(() => false)
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

/**
 * Drops all signed-in state and returns to sign-in. `next` brings the person
 * back to where they were once they sign in again.
 */
export function endSession(reason?: "expired" | "inactive") {
  useAuth.getState().clearUser()
  queryClient.clear()
  if (typeof window === "undefined") return
  const here = window.location.pathname + window.location.search
  const params = new URLSearchParams()
  if (reason) params.set("reason", reason)
  if (here !== "/") params.set("next", here)
  const qs = params.toString()
  window.location.assign(qs ? `/?${qs}` : "/")
}

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean }

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string | string[] }>) => {
    const original = error.config as RetryConfig | undefined
    const status = error.response?.status
    if (!original || isAuthRoute(original.url)) return Promise.reject(error)

    // Access token expired: refresh once, then replay the request.
    if (status === 401 && !original._retry) {
      original._retry = true
      if (await refreshSession()) return api(original)
      // The refresh endpoint clears the cookies; tell the person why they left.
      await api.post("/auth/logout").catch(() => undefined)
      endSession("expired")
      return Promise.reject(error)
    }

    // The account was suspended, rejected or deleted mid-session.
    const msg = error.response?.data?.message
    if (status === 403 && typeof msg === "string" && /account is (not active|pending)/i.test(msg)) {
      await api.post("/auth/logout").catch(() => undefined)
      endSession("inactive")
    }

    return Promise.reject(error)
  }
)

export default api

// ── Helpers ────────────────────────────────────────────────────────────────────
export async function fetchData<T>(url: string): Promise<T> {
  const res = await api.get<T>(url)
  return res.data
}
export async function postData<T>(url: string, data: unknown): Promise<T> {
  const res = await api.post<T>(url, data)
  return res.data
}
export async function updateData<T>(url: string, data: unknown): Promise<T> {
  const res = await api.patch<T>(url, data)
  return res.data
}
export async function deleteData<T>(url: string): Promise<T> {
  const res = await api.delete<T>(url)
  return res.data
}
export async function uploadFile<T>(url: string, formData: FormData): Promise<T> {
  const res = await api.post<T>(url, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return res.data
}
export async function uploadFilePatch<T>(url: string, formData: FormData): Promise<T> {
  const res = await api.patch<T>(url, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return res.data
}
