import type { QueryClient } from "@tanstack/react-query"
import { redirect } from "@tanstack/react-router"
import { orpc } from "./api"
import { apiErrorCode } from "./apiError"

/** `admin.me`: who is signed in and their permissions in the active channel. */
export const meQuery = () => orpc.admin.me.queryOptions({ retry: false, staleTime: 60_000 })

export type Session = Awaited<ReturnType<typeof loadSession>>

/**
 * Router guard helper: the cached session, or `null` when signed out. Before first-run setup the API
 * answers `SETUP_REQUIRED`; that sends the user to `/setup`. Other errors reach the error boundary.
 */
export async function loadSession(queryClient: QueryClient) {
  try {
    return await queryClient.ensureQueryData(meQuery())
  } catch (error) {
    const code = apiErrorCode(error)
    if (code === "UNAUTHENTICATED") return null
    if (code === "SETUP_REQUIRED") throw redirect({ to: "/setup" })
    throw error
  }
}

/** Only same-app paths are followed after login (no open redirect). */
export function safeRedirect(target: string | undefined): string {
  return target?.startsWith("/") && !target.startsWith("//") ? target : "/"
}
