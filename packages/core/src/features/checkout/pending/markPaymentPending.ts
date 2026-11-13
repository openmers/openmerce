import { sql } from "drizzle-orm"
import { affected, type Platform, sqlStatement } from "../../../platform"

/**
 * `active → payment_pending` (05-sepet §3) when the provider reports the payment as started.
 * Release and settlement both accept `payment_pending`; a second call is a no-op.
 */
export async function markPaymentPending(
  ctx: { platform: Pick<Platform, "atomic">; now: number },
  input: { reservationPublicId: string },
): Promise<boolean> {
  const result = await ctx.platform.atomic([
    sqlStatement(sql`UPDATE "checkout_reservations" SET "status" = 'payment_pending',
      "updated_at" = ${ctx.now} WHERE "public_id" = ${input.reservationPublicId}
      AND "status" = 'active'`),
  ])
  return affected(result, 0)
}
