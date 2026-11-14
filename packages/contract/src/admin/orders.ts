import { z } from "zod"
import { adminProcedure } from "../shared/adminProcedure"
import { pageSchema } from "../shared/pagination"
import { orderCursorInput, orderSummarySchema, orderViewSchema } from "../shop/orders"

// Admin orders and payments (07-siparis, 06-odeme §5): channel-scoped, every write audited.
// Payment actions use `orders:write` (no separate payments permission in the dictionary).

const id = z.string().min(1).max(64)
const ok = z.literal(true)

export const adminOrdersList = adminProcedure("orders:read")
  .input(
    orderCursorInput.extend({
      state: z.enum(["placed", "completed", "cancelled"]).optional(),
      personalized: z.boolean().optional(),
    }),
  )
  .output(pageSchema(orderSummarySchema))

export const adminOrdersGet = adminProcedure("orders:read")
  .input(z.object({ id }))
  .output(z.object({ order: orderViewSchema }))

/** Cancellation has its own endpoint (stock release + refunds). */
export const adminOrdersTransition = adminProcedure("orders:write")
  .input(z.object({ id, to: z.literal("completed") }))
  .output(z.object({ ok }))

export const adminOrdersCancel = adminProcedure("orders:write")
  .input(z.object({ id, reason: z.string().trim().max(500).optional() }))
  .output(z.object({ ok, refunds: z.array(z.object({ id: z.string(), state: z.string() })) }))

export const adminPaymentsCapture = adminProcedure("orders:write")
  .input(z.object({ id, amount: z.number().int().min(1).optional() }))
  .output(z.object({ ok, state: z.string() }))

/** Same `idempotencyKey` = same refund (double click); also passed to the provider. */
export const adminPaymentsRefund = adminProcedure("orders:write")
  .input(
    z.object({
      id,
      amount: z.number().int().min(1),
      idempotencyKey: z.string().min(8).max(128),
      reason: z.string().trim().max(500).optional(),
    }),
  )
  .output(z.object({ refund: z.string(), state: z.string() }))

/** Bank transfer received: settles the pending reservation; repeating returns the same order. */
export const adminPaymentsConfirmTransfer = adminProcedure("orders:write")
  .input(z.object({ reservation: id }))
  .output(z.object({ order: z.string(), number: z.string(), created: z.boolean() }))

export const adminOrders = {
  list: adminOrdersList,
  get: adminOrdersGet,
  transition: adminOrdersTransition,
  cancel: adminOrdersCancel,
}

export const adminPayments = {
  capture: adminPaymentsCapture,
  refund: adminPaymentsRefund,
  confirmTransfer: adminPaymentsConfirmTransfer,
}
