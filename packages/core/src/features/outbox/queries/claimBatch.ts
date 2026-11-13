import { outbox } from "@openmers/db"
import { and, eq, inArray, lte } from "drizzle-orm"
import type { AtomicStatement, Db, Platform } from "../../../platform"
import { affected } from "../../../platform"

export type ClaimBatchInput = {
  now: number
  limit: number
}

/** Sahiplenme adayları: `(status, priority, next_attempt_at)` indeksini kullanır. */
export function dueCandidatesQuery(db: Db, input: ClaimBatchInput) {
  return db
    .select({ id: outbox.id })
    .from(outbox)
    .where(and(inArray(outbox.status, ["pending", "failed"]), lte(outbox.nextAttemptAt, input.now)))
    .orderBy(outbox.priority, outbox.nextAttemptAt, outbox.id)
    .limit(input.limit)
    .toSQL()
}

/** Adayı koşullu sahiplenir: satır bu arada başkasına gittiyse 0 satır döner. */
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
 * Sıradaki partiyi sahiplenir. Aday listesi bir okuma turudur; kazananı koşullu `UPDATE` belirler,
 * bu yüzden iki tüketici aynı satırı alamaz. Dönen kimlikler yalnız bu çağrının kazandıklarıdır.
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
