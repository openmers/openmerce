import { settings } from "@openmers/db"
import { and, eq } from "drizzle-orm"
import type { Db } from "../../../platform"
import { SETTINGS_VERSION_KEY } from "../registry"

/** Global settings version; 0 if there is no row. */
export async function getSettingsVersion(db: Db): Promise<number> {
  const rows = await db
    .select({ value: settings.value })
    .from(settings)
    .where(
      and(
        eq(settings.scope, "global"),
        eq(settings.scopeId, 0),
        eq(settings.key, SETTINGS_VERSION_KEY),
      ),
    )
  return rows[0] ? Number(rows[0].value) : 0
}
