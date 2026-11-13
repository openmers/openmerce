import { sql } from "drizzle-orm"
import { sqlStatement } from "../../../platform"
// direct file imports: the payments index re-exports the webhook, which imports checkout → orders
import type { HandlerArgs, PaymentHandler } from "../../payments/port/paymentHandler"
import { createRefund, type RefundOutcome } from "../../payments/refunds/createRefund"
import { releaseStatements, type StockLine } from "../../stock"
import { applyTransition } from "../transitions/applyTransition"
import { type OrderAdminCtx, orderAudit } from "../transitions/transitionOrder"
import { OrderError } from "../types"

export type CancelOrderInput = {
  orderPublicId: string
  reason?: string
  /** The method a payment was made with (registry lookup by `payment_method_id`). */
  methodOf: (methodId: number) => { handler: PaymentHandler; args: HandlerArgs } | undefined
}

export type CancelOrderResult = { cancelled: boolean; refunds: RefundOutcome[] }

/**
 * Cancellation (07-siparis §5): `placed → cancelled` in one `atomic()` that also releases the
 * order's reserved stock, then a refund is started for every settled payment with a remaining
 * balance (an `unknown` provider outcome stays for reconciliation; the order stays cancelled).
 * Only unfulfilled orders: shipment-aware partial release comes with fulfillment.
 *
 * Stock was reserved either under the reservation (normal) or under the order (late settlement);
 * both release sets are added and the stock guard makes the non-matching one a no-op, so no extra
 * read decides it. A late order with `stock_exception` holds nothing and releases nothing.
 */
export async function cancelOrder(
  ctx: OrderAdminCtx,
  input: CancelOrderInput,
): Promise<CancelOrderResult> {
  const [orders = [], payments = []] = await ctx.platform.batch([
    sqlStatement(sql`SELECT o."id", o."state", o."fulfillment_status", o."reservation_id",
        r."snapshot" FROM "orders" o JOIN "checkout_reservations" r ON r."id" = o."reservation_id"
      WHERE o."public_id" = ${input.orderPublicId} AND o."channel_id" = ${ctx.channelId}`),
    sqlStatement(sql`SELECT p."public_id", p."payment_method_id",
        p."amount" - p."refunded_amount" - p."external_refunded_amount" AS "remaining"
      FROM "payments" p JOIN "orders" o ON o."id" = p."order_id"
      WHERE o."public_id" = ${input.orderPublicId} AND p."state" = 'settled'`),
  ])
  const o = orders[0]
  if (!o) throw new OrderError("NOT_FOUND", "order not found")
  if (o.state !== "placed") throw new OrderError("INVALID_TRANSITION", "order is not open")
  if (o.fulfillment_status !== "unfulfilled") {
    throw new OrderError("INVALID_TRANSITION", "order is already being fulfilled")
  }
  const allocation =
    (JSON.parse(String(o.snapshot)) as { allocation?: StockLine[] }).allocation ?? []
  const cancelled = await applyTransition(ctx, {
    orderPublicId: input.orderPublicId,
    from: "placed",
    to: "cancelled",
    actor: { type: ctx.actor.type, id: ctx.actor.id },
    data: input.reason ? { reason: input.reason } : undefined,
    extra: (won) => [
      ...(allocation.length > 0
        ? [
            ...releaseStatements(
              allocation,
              { type: "reservation", id: Number(o.reservation_id) },
              ctx.now,
              won,
            ),
            ...releaseStatements(allocation, { type: "order", id: Number(o.id) }, ctx.now, won),
          ]
        : []),
      orderAudit(ctx, input.orderPublicId, { from: "placed", to: "cancelled" }, won),
    ],
  })
  if (!cancelled) return { cancelled, refunds: [] }

  const refunds: RefundOutcome[] = []
  for (const p of payments) {
    const remaining = Number(p.remaining)
    const method = input.methodOf(Number(p.payment_method_id))
    // no provider refund: the admin records a manual refund (06 §5)
    if (remaining <= 0 || !method?.handler.refund) continue
    refunds.push(
      await createRefund(ctx, {
        paymentPublicId: String(p.public_id),
        amount: remaining,
        idempotencyKey: `cancel:${String(p.public_id)}`,
        reason: input.reason ?? "order cancelled",
        handler: method.handler,
        args: method.args,
      }),
    )
  }
  return { cancelled, refunds }
}
