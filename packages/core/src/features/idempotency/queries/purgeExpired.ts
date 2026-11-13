import { idempotencyKeys } from "@openmers/db"
import { lte } from "drizzle-orm"
import type { AtomicStatement, Db, Platform } from "../../../platform"

/** Deletes expired keys via the `(expires_at)` index. */
export function purgeExpiredStatement(db: Db, now: number): AtomicStatement {
  return db.delete(idempotencyKeys).where(lte(idempotencyKeys.expiresAt, now)).toSQL()
}

/** Number of deleted rows. */
export async function purgeExpired(
  p: Pick<Platform, "db" | "atomic">,
  now: number,
): Promise<number> {
  const [n = 0] = await p.atomic([purgeExpiredStatement(p.db, now)])
  return n
}
