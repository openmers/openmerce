import { outbox } from "@openmers/db"
import { and, eq, lte } from "drizzle-orm"
import type { AtomicStatement, Db, Platform } from "../../../platform"
import { OUTBOX_LIMITS, type OutboxLimits } from "../types"

export type RequeueStuckInput = {
  now: number
  limits?: Pick<OutboxLimits, "claimTimeoutMs">
}

/** Moves rows stuck in `sending` longer than the timeout back to `failed` (decision 8). */
export function requeueStuckStatement(db: Db, input: RequeueStuckInput): AtomicStatement {
  const timeout = (input.limits ?? OUTBOX_LIMITS).claimTimeoutMs
  return db
    .update(outbox)
    .set({ status: "failed", claimedAt: null, updatedAt: input.now })
    .where(and(eq(outbox.status, "sending"), lte(outbox.claimedAt, input.now - timeout)))
    .toSQL()
}

/** Number of requeued rows. */
export async function requeueStuck(
  p: Pick<Platform, "db" | "atomic">,
  input: RequeueStuckInput,
): Promise<number> {
  const [n = 0] = await p.atomic([requeueStuckStatement(p.db, input)])
  return n
}
