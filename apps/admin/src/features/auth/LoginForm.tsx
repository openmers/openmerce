import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { api } from "../../lib/api"
import { toApiError } from "../../lib/apiError"
import { meQuery, safeRedirect } from "../../lib/session"
import { AuthCard } from "./AuthCard"

const fields = [
  { name: "email", label: "Email", type: "email", autoComplete: "username" },
  { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
]

export function LoginForm({ redirect }: { redirect?: string }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const login = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      await api.admin.auth.login({ email: values.email ?? "", password: values.password ?? "" })
      // A fresh session may carry different permissions; reload `me` before entering the app.
      queryClient.removeQueries({ queryKey: meQuery().queryKey })
      await queryClient.fetchQuery(meQuery())
    },
    onSuccess: () => navigate({ href: safeRedirect(redirect) }),
  })

  return (
    <AuthCard
      title="Sign in"
      fields={fields}
      submitLabel="Sign in"
      pending={login.isPending}
      error={login.error ? toApiError(login.error).message : undefined}
      onSubmit={(values) => login.mutate(values)}
    />
  )
}
