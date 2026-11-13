import { settings } from "@openmers/db"
import { and, eq } from "drizzle-orm"
import type { Platform } from "../../../platform"
import { SETUP_COMPLETED_KEY } from "../../settings/registry"

/** `settings (global, 0, 'setup.completed_at')`; satır yoksa `null` (kurulum bitmedi). */
export async function getSetupCompletedAt(p: Pick<Platform, "db">): Promise<number | null> {
  const [row] = await p.db
    .select({ value: settings.value })
    .from(settings)
    .where(
      and(
        eq(settings.scope, "global"),
        eq(settings.scopeId, 0),
        eq(settings.key, SETUP_COMPLETED_KEY),
      ),
    )
    .limit(1)
  return row ? Number(row.value) : null
}
