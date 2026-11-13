import { settings } from "@openmers/db"
import { and, eq, or } from "drizzle-orm"
import type { Db } from "../../../platform"
import type { SettingScope } from "../registry"
import type { SettingRow } from "../resolveSetting"

export type ScopeRef = { scope: SettingScope; scopeId: number }

/** Sorgunun kendisi; `assertNoFullScan` testi aynı SQL'i planlar. */
export function getSettingsQuery(db: Db, scopes: readonly ScopeRef[]) {
  const match = scopes.map((s) => and(eq(settings.scope, s.scope), eq(settings.scopeId, s.scopeId)))
  return db
    .select({
      scope: settings.scope,
      scopeId: settings.scopeId,
      key: settings.key,
      value: settings.value,
    })
    .from(settings)
    .where(or(...match))
}

/** Verilen kapsamların bütün satırları tek sorguda (`settings_scope_key_uq` solundan). */
export async function getSettings(db: Db, scopes: readonly ScopeRef[]): Promise<SettingRow[]> {
  if (scopes.length === 0) return []
  return await getSettingsQuery(db, scopes)
}
