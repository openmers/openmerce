// The permission dictionary lives in code (06-guvenlik-ve-yetki "Roles and permissions"; catalog 01 B: no separate table).
// `role_permissions.permission`, API key and app token permissions come from this dictionary.

export const CORE_PERMISSIONS = [
  "orders:read",
  "orders:write",
  "orders:delete",
  "products:read",
  "products:write",
  "products:delete",
  "customers:read",
  "customers:write",
  "customers:delete",
  "customers:read_pii",
  "companies:read",
  "companies:write",
  "companies:approve",
  "quotes:read",
  "quotes:write",
  "quotes:offer",
  "approvals:decide",
  "prices:read",
  "prices:write",
  "promotions:read",
  "promotions:write",
  "stock:read",
  "stock:write",
  "pages:read",
  "pages:write",
  "media:read",
  "media:write",
  "channels:read",
  "channels:write",
  "settings:read",
  "settings:write",
  "secrets:write",
  "admins:read",
  "admins:write",
  "roles:read",
  "roles:write",
  "apiKeys:read",
  "apiKeys:write",
  "apps:read",
  "apps:write",
  "audit:read",
  "audit:export",
  "outbox:read",
  "outbox:write",
] as const

export type CorePermission = (typeof CORE_PERMISSIONS)[number]

/**
 * Built-in app permissions are added at the type level via module augmentation:
 * `declare module "@openmers/core" { interface AppPermissions { "reviews:moderate": true } }`
 * and at runtime via `registerAppPermissions`.
 */
// biome-ignore lint/suspicious/noEmptyInterface: starts empty for module augmentation
export interface AppPermissions {}

export type Permission = CorePermission | Extract<keyof AppPermissions, string>

export const SUPER_ADMIN_ROLE = "SuperAdmin"

const PERMISSION_FORMAT = /^[a-z][A-Za-z0-9]*:[a-z][a-z0-9_]*$/

export class PermissionError extends Error {
  constructor(
    readonly code: "INVALID_PERMISSION" | "DUPLICATE_PERMISSION",
    message: string,
  ) {
    super(message)
    this.name = "PermissionError"
  }
}

const known = new Set<string>(CORE_PERMISSIONS)
const appOwners = new Map<string, string>()

/** Adds built-in app permissions; format `<entity>:<action>`, a collision with core or another app is an error. */
export function registerAppPermissions(appId: string, permissions: readonly string[]): void {
  for (const p of permissions) {
    if (!PERMISSION_FORMAT.test(p)) {
      throw new PermissionError("INVALID_PERMISSION", `geçersiz izin biçimi: ${p}`)
    }
    if (known.has(p) && appOwners.get(p) !== appId) {
      throw new PermissionError("DUPLICATE_PERMISSION", `izin zaten kayıtlı: ${p}`)
    }
  }
  for (const p of permissions) {
    known.add(p)
    appOwners.set(p, appId)
  }
}

export function isPermission(value: string): value is Permission {
  return known.has(value)
}

/** All registered permissions (core + apps); used to resolve `SuperAdmin`. */
export function allPermissions(): ReadonlySet<string> {
  return known
}
