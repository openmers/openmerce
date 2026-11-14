import { sql } from "drizzle-orm"
import { sqlStatement } from "../../../platform"
import { auditStatement } from "../../audit"
// direct file imports: checkout's index pulls in reconciliation, which imports payments
import { type SettleResult, settle } from "../../checkout/settle/settle"
import { parseSnapshot } from "../../checkout/settle/snapshot"
import { auditActorOf } from "../../customers/account/auditActor"
import type { PaymentMethod } from "../registry/paymentMethods"
import { PaymentError } from "../types"
import type { AdminPaymentCtx } from "./adminPayments"

type MethodOf = (methodId: number) => Pick<PaymentMethod, "handler"> | undefined

/**
 * Admin marks a bank transfer as received (06 §9): settles the pending reservation with a
 * `settled` payment of the reserved total through the shared `settle()`. Idempotent: a second
 * call (or a concurrent one) gets the same order and writes nothing; only the call that created
 * the order is audited. An already expired reservation takes the late path (stock exception).
 */
export async function confirmBankTransfer(
  ctx: AdminPaymentCtx,
  input: { reservationPublicId: string; methodOf: MethodOf },
): Promise<SettleResult> {
  const [rows = []] = await ctx.platform.batch([
    sqlStatement(sql`SELECT "payment_method_id", "snapshot" FROM "checkout_reservations"
      WHERE "public_id" = ${input.reservationPublicId} AND "channel_id" = ${ctx.channelId}`),
  ])
  const row = rows[0]
  if (!row) throw new PaymentError("NOT_FOUND", "reservation not found")
  const handler = input.methodOf(Number(row.payment_method_id))?.handler
  // manual methods that wait for money; cash on delivery settles on confirm and never comes here
  if (handler?.kind !== "manual" || handler.settleOnConfirm) {
    throw new PaymentError("NOT_SUPPORTED", "not a manual transfer method")
  }
  const snap = parseSnapshot(row.snapshot)
  const result = await settle(ctx, {
    reservationPublicId: input.reservationPublicId,
    payment: {
      amount: snap.totals.gross,
      currency: snap.currency,
      reference: null,
      state: "settled",
    },
  })
  if (result.created) {
    await ctx.platform.atomic([
      auditStatement(
        ctx.platform.db,
        {
          actor: auditActorOf(ctx.actor),
          action: "payments:confirm_transfer",
          entityType: "order",
          entityPublicId: result.orderPublicId,
          channelId: ctx.channelId,
          after: { reservation: input.reservationPublicId, amount: snap.totals.gross },
          requestId: ctx.requestId,
        },
        ctx.now,
      ),
    ])
  }
  return result
}
