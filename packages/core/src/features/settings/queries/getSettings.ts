import { settings } from "@openmers/db"
import { and, eq, or } from "drizzle-orm"
import type { Db } from "../../../platform"
import type { SettingScope } from "../registry"
import type { SettingRow } from "../resolveSetting"

export type ScopeRef = { scope: SettingScope; scopeId: number }

/** The query itself; the `assertNoFullScan` test plans the same SQL. */
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

/** All rows of the given scopes in one query (from the left of `settings_scope_key_uq`). */
export async function getSettings(db: Db, scopes: readonly ScopeRef[]): Promise<SettingRow[]> {
  if (scopes.length === 0) return []
  return await getSettingsQuery(db, scopes)
}
