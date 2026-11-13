import { sql } from "drizzle-orm"
import { type Platform, sqlStatement } from "../../../platform"
import { releaseReservation } from "../release/releaseReservation"
import { OPEN_RESERVATION_STATUSES } from "../types"

export type SweepInput = {
  /** Methods whose local `expires_at` is authoritative (manual: bank transfer). */
  methodIds: readonly number[]
  limit?: number
}

const open = () =>
  sql.join(
    OPEN_RESERVATION_STATUSES.map((s) => sql`${s}`),
    sql`, `,
  )

/** Expired open reservations of the given methods (`checkout_reservations_open_idx`). */
export function expiredQuery(now: number, input: SweepInput) {
  const ids = sql.join(
    input.methodIds.map((id) => sql`${id}`),
    sql`, `,
  )
  return sqlStatement(sql`SELECT "public_id" FROM "checkout_reservations"
    WHERE "status" IN (${open()}) AND "expires_at" <= ${now} AND "payment_method_id" IN (${ids})
    ORDER BY "expires_at" LIMIT ${input.limit ?? 100}`)
}

/**
 * Sweep (05-sepet §4): releases expired reservations of manual methods as `expired`, stock and
 * coupon usage returned. Hosted payment pages are never swept here (only a verified webhook or
 * reconciliation releases them). Each release is its own conditional `atomic()`, so a concurrent
 * settlement wins cleanly. Returns how many this run released.
 */
export async function sweepExpired(
  ctx: { platform: Pick<Platform, "atomic" | "batch">; now: number },
  input: SweepInput,
): Promise<number> {
  if (input.methodIds.length === 0) return 0
  const [rows = []] = await ctx.platform.batch([expiredQuery(ctx.now, input)])
  let released = 0
  for (const r of rows) {
    const reservationPublicId = String(r.public_id)
    if (await releaseReservation(ctx, { reservationPublicId, status: "expired" })) released++
  }
  return released
}
