import { toast } from "sonner"
import api from "./api"
import { apiErrorMessage } from "./api-error"

/**
 * Downloads a file from the API. Going through the API client (not a plain
 * link) means an expired session is refreshed first, and a failure shows a
 * readable message instead of a JSON error page.
 */
export async function downloadFile(path: string, fallbackName: string) {
  const id = toast.loading("Preparing download…")
  try {
    const res = await api.get<Blob>(path, { responseType: "blob" })
    const disposition = String(res.headers["content-disposition"] ?? "")
    const name = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? fallbackName
    const url = URL.createObjectURL(res.data)
    const a = document.createElement("a")
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Download started", { id })
  } catch (err) {
    toast.error(apiErrorMessage(err, "The download failed. Please try again."), { id })
  }
}
