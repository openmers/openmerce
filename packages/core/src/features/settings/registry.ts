import type { settingScopes } from "@openmers/db"
import { z } from "zod"

export type SettingScope = (typeof settingScopes)[number]

export type SettingDefinition<T = unknown> = {
  schema: z.ZodType<T>
  /** Code default used when there is no row. */
  default: T
  /** Scopes `setSetting` may write; empty = internal key, not writable from outside. */
  scopes: readonly SettingScope[]
}

export type SettingErrorCode =
  | "UNKNOWN_SETTING"
  | "INVALID_SETTING"
  | "SECRET_KEY"
  | "SCOPE_NOT_ALLOWED"
  | "DUPLICATE_SETTING"

export class SettingError extends Error {
  constructor(
    readonly code: SettingErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "SettingError"
  }
}

// Secrets live in the vault (07-yapilandirma "Settings store"); a key carrying these names cannot be a setting.
const SECRET_LIKE = /(secret|password|passwd|token|api[_-]?key|private[_-]?key|credential)/i

export function looksLikeSecret(key: string): boolean {
  return SECRET_LIKE.test(key)
}

const registry = new Map<string, SettingDefinition>()

/** Registers the key; a duplicate or secret-looking key is an error. */
export function registerSetting<T>(key: string, def: SettingDefinition<T>): void {
  if (looksLikeSecret(key)) throw new SettingError("SECRET_KEY", `sır gibi görünen anahtar: ${key}`)
  if (registry.has(key))
    throw new SettingError("DUPLICATE_SETTING", `anahtar zaten kayıtlı: ${key}`)
  registry.set(key, def as SettingDefinition)
}

/** Built-in app key: registered with the `<appId>.<key>` prefix (catalog 01 `built_in_app`). */
export function registerAppSetting<T>(appId: string, key: string, def: SettingDefinition<T>): void {
  registerSetting(`${appId}.${key}`, def)
}

export function getSettingDefinition(key: string): SettingDefinition {
  const def = registry.get(key)
  if (!def) throw new SettingError("UNKNOWN_SETTING", `bilinmeyen ayar: ${key}`)
  return def
}

/** Before writing: the key is registered, the scope allowed, the value matches the schema. Returns the parsed value. */
export function parseSettingValue(key: string, scope: SettingScope, value: unknown): unknown {
  if (looksLikeSecret(key)) throw new SettingError("SECRET_KEY", `sır gibi görünen anahtar: ${key}`)
  const def = getSettingDefinition(key)
  if (!def.scopes.includes(scope)) {
    throw new SettingError("SCOPE_NOT_ALLOWED", `${key} ${scope} kapsamında yazılamaz`)
  }
  const parsed = def.schema.safeParse(value)
  if (!parsed.success) throw new SettingError("INVALID_SETTING", `${key}: ${parsed.error.message}`)
  return parsed.data
}

export const SETTINGS_VERSION_KEY = "settings.version"
export const SETUP_COMPLETED_KEY = "setup.completed_at"

// Initial keys. `settings.version` is an internal counter (setSetting increments it, nobody writes it).
registerSetting(SETTINGS_VERSION_KEY, { schema: z.number().int().min(0), default: 0, scopes: [] })
// The setup time is only written by `markSetupCompleted`; closed to setSetting.
registerSetting(SETUP_COMPLETED_KEY, {
  schema: z.number().int().min(0),
  default: 0,
  scopes: [],
})
registerSetting("store.name", {
  schema: z.string().trim().min(1).max(120),
  default: "My Store",
  scopes: ["global", "channel"],
})
registerSetting("audit.retention_days", {
  schema: z.number().int().min(1).max(3650),
  default: 730,
  scopes: ["global"],
})
