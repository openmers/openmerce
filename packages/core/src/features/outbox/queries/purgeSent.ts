import { outbox } from "@openmers/db"
import { and, eq, lte } from "drizzle-orm"
import type { AtomicStatement, Db, Platform } from "../../../platform"
import { OUTBOX_LIMITS, type OutboxLimits } from "../types"

export type PurgeSentInput = {
  now: number
  limits?: Pick<OutboxLimits, "sentRetentionMs">
}

// Retention age is measured on `created_at`: the `(status, created_at)` index allows a sweep without a full
// scan (catalog 01 index decision).
export function purgeSentStatement(db: Db, input: PurgeSentInput): AtomicStatement {
  const retention = (input.limits ?? OUTBOX_LIMITS).sentRetentionMs
  return db
    .delete(outbox)
    .where(and(eq(outbox.status, "sent"), lte(outbox.createdAt, input.now - retention)))
    .toSQL()
}

/** Number of deleted rows. */
export async function purgeSent(
  p: Pick<Platform, "db" | "atomic">,
  input: PurgeSentInput,
): Promise<number> {
  const [n = 0] = await p.atomic([purgeSentStatement(p.db, input)])
  return n
}
