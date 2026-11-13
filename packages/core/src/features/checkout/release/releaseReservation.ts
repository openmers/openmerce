import { sql } from "drizzle-orm"
import { affected, type Platform, sqlStatement } from "../../../platform"
import { buildReleaseUsageStatements } from "../../promotions"
import { releaseStatements, type StockLine } from "../../stock"
import { CheckoutError, OPEN_RESERVATION_STATUSES } from "../types"

export type ReleaseStatus = "released" | "expired" | "failed"

/**
 * Releases a reservation (05-sepet §4) in one `atomic()`: status changes only from
 * `active`/`payment_pending`; stock and promotion reversals are bound to "reservation is now in
 * `status`" (if a concurrent settlement made it `settled`, stock and coupon are not returned). A
 * second release is a no-op: the status guard fails and stock already has a release movement.
 * Returns whether this call released it.
 */
export async function releaseReservation(
  ctx: { platform: Pick<Platform, "atomic" | "batch">; now: number },
  input: { reservationPublicId: string; status?: ReleaseStatus },
): Promise<boolean> {
  const to = input.status ?? "released"
  const [rows = []] = await ctx.platform.batch([
    sqlStatement(sql`SELECT "id", "status", "snapshot" FROM "checkout_reservations"
      WHERE "public_id" = ${input.reservationPublicId}`),
  ])
  const row = rows[0]
  if (!row) throw new CheckoutError("NOT_FOUND", "rezervasyon yok")
  if (!(OPEN_RESERVATION_STATUSES as readonly unknown[]).includes(row.status)) return false
  const id = Number(row.id)
  const snapshot = JSON.parse(String(row.snapshot)) as { allocation?: StockLine[] }
  const allocation = snapshot.allocation ?? []

  const open = sql.join(
    OPEN_RESERVATION_STATUSES.map((s) => sql`${s}`),
    sql`, `,
  )
  // `NULL` unless status is `to`: no usage row matches, reversals stay no-ops
  const mine = sql`(SELECT "id" FROM "checkout_reservations" WHERE "id" = ${id}
    AND "status" = ${to})`
  const stmts = [
    sqlStatement(sql`UPDATE "checkout_reservations" SET "status" = ${to}, "updated_at" = ${ctx.now}
      WHERE "id" = ${id} AND "status" IN (${open})`),
    ...(allocation.length > 0
      ? releaseStatements(
          allocation,
          { type: "reservation", id },
          ctx.now,
          sql`${mine} IS NOT NULL`,
        )
      : []),
    ...buildReleaseUsageStatements(mine),
  ]
  const result = await ctx.platform.atomic(stmts)
  return affected(result, 0)
}
