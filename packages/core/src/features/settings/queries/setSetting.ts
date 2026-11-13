import { settings } from "@openmers/db"
import { sql } from "drizzle-orm"
import type { Platform } from "../../../platform"
import { type AuditActor, auditStatement } from "../../audit"
import { parseSettingValue, SETTINGS_VERSION_KEY, type SettingScope } from "../registry"

export type SetSettingInput = { scope: SettingScope; scopeId: number; key: string; value: unknown }

const target = [settings.scope, settings.scopeId, settings.key]

/**
 * Zod doğrulama → tek `atomic()`: upsert + global `settings.version` +1 + denetim satırı.
 * Geçersiz değer, izinsiz kapsam, bilinmeyen ya da sır gibi görünen anahtar `SettingError` atar.
 * Denetim aynı birimde olduğu için ayar yazılmadıysa denetim satırı da yoktur.
 */
export async function setSetting(
  p: Pick<Platform, "db" | "atomic">,
  input: SetSettingInput,
  now: number,
  actor: AuditActor,
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
  const audit = auditStatement(
    p.db,
    {
      actor,
      action: "settings:write",
      entityType: "setting",
      entityPublicId: `${input.scope}:${input.scopeId}:${input.key}`,
      channelId: input.scope === "channel" ? input.scopeId : undefined,
      after: { scope: input.scope, scopeId: input.scopeId, key: input.key, value },
    },
    now,
  )
  await p.atomic([upsert, bump, audit])
}
