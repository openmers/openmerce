// İzin sözlüğü kodda (06-guvenlik-ve-yetki "Roller ve izinler"; katalog 01 B: ayrı tablo yok).
// `role_permissions.permission`, API anahtarı ve uygulama token'ı izinleri bu sözlükten gelir.

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
 * Built-in app izinleri tip düzeyinde modül genişletmesiyle eklenir:
 * `declare module "@openmers/core" { interface AppPermissions { "reviews:moderate": true } }`
 * ve çalışma zamanında `registerAppPermissions` ile.
 */
// biome-ignore lint/suspicious/noEmptyInterface: modül genişletmesi için boş başlar
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

/** Built-in app izinlerini ekler; biçim `<varlık>:<eylem>`, çekirdek ya da başka app ile çakışma hatadır. */
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

/** Kayıtlı bütün izinler (çekirdek + app); `SuperAdmin` çözümlemesi bunu kullanır. */
export function allPermissions(): ReadonlySet<string> {
  return known
}
