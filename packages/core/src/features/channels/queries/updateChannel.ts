import { channels } from "@openmers/db"
import { eq, sql } from "drizzle-orm"
import type { Platform } from "../../../platform"

/** Değiştirilebilir alanlar; kimlik, varsayılanlık ve sayaç dışarıda. */
export type ChannelPatch = Partial<
  Omit<
    typeof channels.$inferInsert,
    "id" | "publicId" | "isDefault" | "settingsVersion" | "createdAt" | "updatedAt"
  >
>

/** Alanları günceller; `settings_version + 1` ve `updated_at` aynı ifadede. Etkilenen satır (0 = yok). */
export async function updateChannel(
  p: Pick<Platform, "db" | "atomic">,
  id: number,
  patch: ChannelPatch,
  now: number,
): Promise<number> {
  const stmt = p.db
    .update(channels)
    .set({ ...patch, settingsVersion: sql`${channels.settingsVersion} + 1`, updatedAt: now })
    .where(eq(channels.id, id))
    .toSQL()
  const [n = 0] = await p.atomic([stmt])
  return n
}
