import { settings } from "@openmers/db"
import { sql } from "drizzle-orm"
import type { Platform } from "../../../platform"
import { parseSettingValue, SETTINGS_VERSION_KEY, type SettingScope } from "../registry"

export type SetSettingInput = { scope: SettingScope; scopeId: number; key: string; value: unknown }

const target = [settings.scope, settings.scopeId, settings.key]

/**
 * Zod doğrulama → tek `atomic()`: upsert + global `settings.version` +1.
 * Geçersiz değer, izinsiz kapsam, bilinmeyen ya da sır gibi görünen anahtar `SettingError` atar.
 */
export async function setSetting(
  p: Pick<Platform, "db" | "atomic">,
  input: SetSettingInput,
  now: number,
): Promise<void> {
  const value = parseSettingValue(input.key, input.scope, input.value)
  const upsert = p.db
    .insert(settings)
    .values({ ...input, value, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({ target, set: { value, updatedAt: now } })
    .toSQL()
  const bump = p.db
    .insert(settings)
    .values({
      scope: "global",
      scopeId: 0,
      key: SETTINGS_VERSION_KEY,
      value: 1,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({ target, set: { value: sql`${settings.value} + 1`, updatedAt: now } })
    .toSQL()
  // shortcut: audit_log tablosu 0004'te, eklenince aynı atomic'e girer
  await p.atomic([upsert, bump])
}
