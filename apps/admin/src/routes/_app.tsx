import { createFileRoute, redirect } from "@tanstack/react-router"
import { AppShell } from "../features/shell/AppShell"
import { loadSession } from "../lib/session"

// Every signed-in page lives under this pathless layout; signed-out visits go to login.
export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context, location }) => {
    const session = await loadSession(context.queryClient)
    if (!session) throw redirect({ to: "/login", search: { redirect: location.href } })
    return { session }
  },
  component: AppShell,
})
