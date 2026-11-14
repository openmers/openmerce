import {
  Avatar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  toast,
} from "@openmers/ui"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { api } from "../../lib/api"
import { toApiError } from "../../lib/apiError"
import { meQuery } from "../../lib/session"

export function UserMenu() {
  const { data } = useQuery(meQuery())
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  async function logout() {
    try {
      await api.admin.auth.logout()
    } catch (error) {
      toast.error(toApiError(error).message)
      return
    }
    queryClient.clear()
    await navigate({ to: "/login" })
  }

  const name = data?.admin.name ?? ""
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="User menu" className="rounded-full">
        <Avatar fallback={name.slice(0, 1).toUpperCase() || "?"} variant="rounded" size="small" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{data?.admin.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={logout}>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
