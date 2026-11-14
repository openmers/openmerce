import { useQuery } from "@tanstack/react-query"
import { meQuery } from "./session"

/** UI-only check for hiding menu items and buttons; the API enforces the real permission. */
export function can(permissions: readonly string[] | undefined, permission?: string): boolean {
  return permission === undefined || (permissions?.includes(permission) ?? false)
}

export function usePermissions() {
  const { data } = useQuery(meQuery())
  const permissions = data?.permissions
  return {
    permissions: permissions ?? [],
    can: (permission?: string) => can(permissions, permission),
  }
}
