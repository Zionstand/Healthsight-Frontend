import { isAxiosError } from "axios"

/** What to say when the server gives no message a person can use. */
function statusMessage(status: number): string | null {
  if (status === 401) return "Your session has ended. Please sign in again."
  if (status === 403) return "You don't have permission to do that."
  if (status === 404) return "We couldn't find what you were looking for."
  if (status === 413) return "That file is too large."
  if (status === 429) return "Too many attempts. Please wait a minute and try again."
  // Render returns these while the server is waking up or redeploying.
  if (status === 502 || status === 503 || status === 504)
    return "The server is starting up. Please try again in a few seconds."
  if (status >= 500) return "Something went wrong on our side. Please try again."
  return null
}

// Framework defaults that say nothing useful to a person.
const GENERIC =
  /^(internal server error|bad request|not found|forbidden|forbidden resource|unauthorized|bad gateway|service unavailable|gateway timeout)$/i

/**
 * The message to show for a failed API call.
 *
 * Order: the server's own message (NestJS validation errors arrive as an
 * array), then a plain-English message for the status, then `fallback`.
 */
export function apiErrorMessage(
  err: unknown,
  fallback = "That didn't work. Please check the details and try again."
): string {
  if (!isAxiosError<{ message?: string | string[] }>(err)) return fallback

  if (!err.response) {
    if (typeof navigator !== "undefined" && navigator.onLine === false)
      return "You're offline. Check your internet connection and try again."
    return "We couldn't reach the server. Check your connection and try again."
  }

  const raw = err.response.data?.message
  const msg = Array.isArray(raw) ? raw.join(", ") : raw
  if (typeof msg === "string" && msg.trim() && !GENERIC.test(msg.trim())) return msg

  return statusMessage(err.response.status) ?? fallback
}

/** HTTP status of a failed API call, or 0 for network failures. */
export function apiErrorStatus(err: unknown): number {
  return isAxiosError(err) ? (err.response?.status ?? 0) : 0
}
