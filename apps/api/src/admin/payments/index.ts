import { capturePayment, confirmBankTransfer, refundPayment } from "@openmers/core"
import { base } from "../../orpc/base"
import { rethrowCommerce } from "../../orpc/commerceErrors"
import { adminCtx } from "../commerceCtx"

const capture = base.admin.payments.capture.handler(async ({ input, context }) => {
  const { ctx, methodOf } = await adminCtx(context)
  const r = await capturePayment(ctx, {
    paymentPublicId: input.id,
    amount: input.amount,
    methodOf,
  }).catch(rethrowCommerce)
  return { ok: true as const, state: r.state }
})

const refund = base.admin.payments.refund.handler(async ({ input, context }) => {
  const { ctx, methodOf } = await adminCtx(context)
  const r = await refundPayment(ctx, {
    paymentPublicId: input.id,
    amount: input.amount,
    idempotencyKey: input.idempotencyKey,
    reason: input.reason,
    methodOf,
  }).catch(rethrowCommerce)
  return { refund: r.refundPublicId, state: r.state }
})

const confirmTransfer = base.admin.payments.confirmTransfer.handler(async ({ input, context }) => {
  const { ctx, methodOf } = await adminCtx(context)
  const r = await confirmBankTransfer(ctx, {
    reservationPublicId: input.reservation,
    methodOf,
  }).catch(rethrowCommerce)
  return { order: r.orderPublicId, number: r.number, created: r.created }
})

/** Admin payments router: same shape as `contract.admin.payments`. */
export const paymentsRouter = { capture, refund, confirmTransfer }
