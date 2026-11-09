"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"
import api from "@/lib/api"
import { queryClient } from "@/lib/query-client"
import { useAuth } from "@/store/useAuth"

/** Ends the session on the server, then clears every trace of it here. */
export const useSignout = () => {
  const router = useRouter()

  return async function signout() {
    // The server clears the cookies even if the session already expired.
    await api.post("/auth/logout").catch(() => undefined)
    useAuth.getState().clearUser()
    queryClient.clear()
    router.replace("/")
    toast.success("Signed out")
  }
}
