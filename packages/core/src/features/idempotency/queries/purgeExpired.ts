import { idempotencyKeys } from "@openmers/db"
import { lte } from "drizzle-orm"
import type { AtomicStatement, Db, Platform } from "../../../platform"

/** `(expires_at)` indeksiyle süresi dolan anahtarları siler. */
export function purgeExpiredStatement(db: Db, now: number): AtomicStatement {
  return db.delete(idempotencyKeys).where(lte(idempotencyKeys.expiresAt, now)).toSQL()
}

/** Silinen satır sayısı. */
export async function purgeExpired(
  p: Pick<Platform, "db" | "atomic">,
  now: number,
): Promise<number> {
  const [n = 0] = await p.atomic([purgeExpiredStatement(p.db, now)])
  return n
}
