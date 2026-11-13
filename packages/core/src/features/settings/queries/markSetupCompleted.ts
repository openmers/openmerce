import { settings } from "@openmers/db"
import type { Platform } from "../../../platform"
import { SETUP_COMPLETED_KEY } from "../registry"

/** `setup.completed_at` satırını bir kez yazar; etkilenen satır (0 = kurulum zaten bitmiş). */
export async function markSetupCompleted(
  p: Pick<Platform, "db" | "atomic">,
  now: number,
): Promise<number> {
  const insert = p.db
    .insert(settings)
    .values({
      scope: "global",
      scopeId: 0,
      key: SETUP_COMPLETED_KEY,
      value: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .toSQL()
  const [n = 0] = await p.atomic([insert])
  return n
}
