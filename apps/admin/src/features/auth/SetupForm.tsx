import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { api } from "../../lib/api"
import { toApiError } from "../../lib/apiError"
import { AuthCard } from "./AuthCard"

const fields = [
  { name: "name", label: "Name", type: "text", autoComplete: "name" },
  { name: "email", label: "Email", type: "email", autoComplete: "username" },
  { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
]

/** First run: creates the first admin; the API closes this endpoint once setup is done. */
export function SetupForm() {
  const navigate = useNavigate()
  const setup = useMutation({
    mutationFn: (values: Record<string, string>) =>
      api.admin.setup.create({
        name: values.name ?? "",
        email: values.email ?? "",
        password: values.password ?? "",
      }),
    onSuccess: () => navigate({ to: "/login" }),
  })
  const error = setup.error ? toApiError(setup.error) : undefined

  return (
    <AuthCard
      title="Set up your store"
      fields={fields}
      submitLabel="Create admin"
      pending={setup.isPending}
      error={error?.code === "SETUP_DONE" ? `${error.message} Sign in instead.` : error?.message}
      onSubmit={(values) => setup.mutate(values)}
    />
  )
}
