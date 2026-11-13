import { outbox } from "@openmers/db"
import { and, eq } from "drizzle-orm"
import type { AtomicStatement, Db, Platform } from "../../../platform"

/** Yalnız bu tüketicinin sahiplendiği (`sending`) satırı `sent` yapar. */
export function markSentStatement(db: Db, id: number, now: number): AtomicStatement {
  return db
    .update(outbox)
    .set({ status: "sent", claimedAt: null, lastError: null, updatedAt: now })
    .where(and(eq(outbox.id, id), eq(outbox.status, "sending")))
    .toSQL()
}

/** `true` = geçiş bu çağrıda oldu; `false` = satır artık `sending` değil. */
export async function markSent(
  p: Pick<Platform, "db" | "atomic">,
  id: number,
  now: number,
): Promise<boolean> {
  const [n = 0] = await p.atomic([markSentStatement(p.db, id, now)])
  return n > 0
}
