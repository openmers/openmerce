import { outbox } from "@openmers/db"
import { and, eq, inArray, lte } from "drizzle-orm"
import type { AtomicStatement, Db, Platform } from "../../../platform"
import { affected } from "../../../platform"

export type ClaimBatchInput = {
  now: number
  limit: number
}

/** Claim candidates: uses the `(status, priority, next_attempt_at)` index. */
export function dueCandidatesQuery(db: Db, input: ClaimBatchInput) {
  return db
    .select({ id: outbox.id })
    .from(outbox)
    .where(and(inArray(outbox.status, ["pending", "failed"]), lte(outbox.nextAttemptAt, input.now)))
    .orderBy(outbox.priority, outbox.nextAttemptAt, outbox.id)
    .limit(input.limit)
    .toSQL()
}

/** Claims a candidate conditionally: returns 0 rows if the row went to someone else in the meantime. */
export function claimStatement(db: Db, id: number, now: number): AtomicStatement {
  return db
    .update(outbox)
    .set({ status: "sending", claimedAt: now, updatedAt: now })
    .where(
      and(
        eq(outbox.id, id),
        inArray(outbox.status, ["pending", "failed"]),
        lte(outbox.nextAttemptAt, now),
      ),
    )
    .toSQL()
}

/**
 * Claims the next batch. The candidate list is one read round trip; a conditional `UPDATE` decides the winner,
 * so two consumers cannot take the same row. The returned ids are only the ones this call won.
 */
export async function claimBatch(
  p: Pick<Platform, "db" | "atomic" | "batch">,
  input: ClaimBatchInput,
): Promise<number[]> {
  if (input.limit < 1) return []
  const [rows = []] = await p.batch([dueCandidatesQuery(p.db, input)])
  const ids = rows.map((row) => Number(row.id)).filter((id) => Number.isFinite(id))
  if (ids.length === 0) return []

  const result = await p.atomic(ids.map((id) => claimStatement(p.db, id, input.now)))
  return ids.filter((_, i) => affected(result, i))
}
