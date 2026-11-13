import type { settingScopes } from "@openmers/db"
import { z } from "zod"

export type SettingScope = (typeof settingScopes)[number]

export type SettingDefinition<T = unknown> = {
  schema: z.ZodType<T>
  /** Satır yoksa kullanılan kod varsayılanı. */
  default: T
  /** `setSetting`'in yazabileceği kapsamlar; boş = iç anahtar, dışarıdan yazılamaz. */
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

// Sırlar kasada durur (07-yapilandirma "Ayar deposu"); bu adları taşıyan anahtar ayar olamaz.
const SECRET_LIKE = /(secret|password|passwd|token|api[_-]?key|private[_-]?key|credential)/i

export function looksLikeSecret(key: string): boolean {
  return SECRET_LIKE.test(key)
}

const registry = new Map<string, SettingDefinition>()

/** Anahtarı kaydeder; tekrar ya da sır gibi görünen anahtar hatadır. */
export function registerSetting<T>(key: string, def: SettingDefinition<T>): void {
  if (looksLikeSecret(key)) throw new SettingError("SECRET_KEY", `sır gibi görünen anahtar: ${key}`)
  if (registry.has(key))
    throw new SettingError("DUPLICATE_SETTING", `anahtar zaten kayıtlı: ${key}`)
  registry.set(key, def as SettingDefinition)
}

/** Built-in app anahtarı: `<appId>.<key>` önekiyle kaydedilir (katalog 01 `built_in_app`). */
export function registerAppSetting<T>(appId: string, key: string, def: SettingDefinition<T>): void {
  registerSetting(`${appId}.${key}`, def)
}

export function getSettingDefinition(key: string): SettingDefinition {
  const def = registry.get(key)
  if (!def) throw new SettingError("UNKNOWN_SETTING", `bilinmeyen ayar: ${key}`)
  return def
}

/** Yazımdan önce: anahtar kayıtlı, kapsam izinli, değer şemaya uygun. Ayrıştırılmış değeri döner. */
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

// Başlangıç anahtarları. `settings.version` iç sayaçtır (setSetting artırır, kimse yazmaz).
registerSetting(SETTINGS_VERSION_KEY, { schema: z.number().int().min(0), default: 0, scopes: [] })
// Kurulum zamanı yalnız `markSetupCompleted` ile yazılır; setSetting'e kapalı.
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
