import { isAxiosError } from "axios"

/**
 * The human-readable message from a failed API call. NestJS validation errors
 * arrive as an array of messages, other errors as a single string.
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError<{ message?: string | string[] }>(err)) {
    const msg = err.response?.data?.message
    if (Array.isArray(msg)) return msg.join(", ")
    if (msg) return msg
  }
  return fallback
}
