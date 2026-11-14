import { createFileRoute } from "@tanstack/react-router"
import { LoginForm } from "../features/auth/LoginForm"

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search.redirect === "string" ? { redirect: search.redirect } : {},
  component: function LoginRoute() {
    return <LoginForm redirect={Route.useSearch().redirect} />
  },
})
