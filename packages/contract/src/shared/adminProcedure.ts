import { defineMeta, oc } from "@orpc/contract"

/**
 * Access declaration of an Admin procedure (`06-guvenlik-ve-yetki`: every handler declares the permission it needs).
 * - `<entity>:<action>`: session + this permission.
 * - `"session"`: only a valid admin session (e.g. `admin.me`).
 * - `"public"`: no session (setup, login, logout); the setup gate still applies.
 */
export type AdminAccess = `${string}:${string}` | "session" | "public"

const [adminAccessMeta, readAdminAccess] = defineMeta(
  "adminAccess",
  (incoming: AdminAccess) => incoming,
)

/**
 * The Admin contract starts only with this; an Admin procedure without meta stays closed on the server
 * (`requirePermission` 403) and `admin-access.test.ts` breaks if it finds an endpoint without meta in the contract.
 */
export function adminProcedure(access: AdminAccess) {
  return oc.meta(adminAccessMeta(access))
}

/** The procedure's access declaration; `undefined` if missing (treat as closed). */
export const getAdminAccess = readAdminAccess
