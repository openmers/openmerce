import { outbox } from "@openmers/db"
import { and, eq } from "drizzle-orm"
import type { AtomicStatement, Db, Platform } from "../../../platform"

/** Turns only the row claimed by this consumer (`sending`) into `sent`. */
export function markSentStatement(db: Db, id: number, now: number): AtomicStatement {
  return db
    .update(outbox)
    .set({ status: "sent", claimedAt: null, lastError: null, updatedAt: now })
    .where(and(eq(outbox.id, id), eq(outbox.status, "sending")))
    .toSQL()
}

/** `true` = the transition happened in this call; `false` = the row is no longer `sending`. */
export async function markSent(
  p: Pick<Platform, "db" | "atomic">,
  id: number,
  now: number,
): Promise<boolean> {
  const [n = 0] = await p.atomic([markSentStatement(p.db, id, now)])
  return n > 0
}
