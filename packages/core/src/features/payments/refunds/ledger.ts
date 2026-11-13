import { refunds } from "@openmers/db"
import { type SQL, sql } from "drizzle-orm"
import {
  type AtomicStatement,
  guardedInsertStatement,
  type Platform,
  sqlStatement,
} from "../../../platform"
// direct file import: orders/cancel imports the refund ledger (index-to-index cycle)
import { refreshDerivedState } from "../../orders/derived/refreshDerivedState"
import { enqueueStatement } from "../../outbox"
import { PaymentError } from "../types"
import { allocateRefundTax, type TaxLineShare } from "./allocateRefundTax"

export type RefundCtx = { platform: Pick<Platform, "atomic" | "batch" | "db">; now: number }

export type LoadedPayment = {
  id: number
  publicId: string
  orderId: number
  orderPublicId: string
  methodId: number
  amount: number
  currency: string
  state: string
  reference: string | null
  providerRefunded: number
  externalRefunded: number
  orderGross: number
  taxLines: TaxLineShare[]
}

/** Payment + its order's gross and tax lines in one `batch`; `where` filters alias `p`. */
export async function loadPayment(
  platform: Pick<Platform, "batch">,
  where: SQL,
): Promise<LoadedPayment | null> {
  const [rows = [], taxes = []] = await platform.batch([
    sqlStatement(sql`SELECT p."id", p."public_id", p."order_id", o."public_id" AS "order_public_id",
      p."payment_method_id", p."amount", p."currency", p."state", p."provider_reference",
      p."refunded_amount", p."external_refunded_amount", o."total_gross"
      FROM "payments" p JOIN "orders" o ON o."id" = p."order_id" WHERE ${where}`),
    sqlStatement(sql`SELECT t."order_line_id", t."rate_bp", t."amount" FROM "order_tax_lines" t
      JOIN "payments" p ON p."order_id" = t."order_id" WHERE ${where} ORDER BY t."id"`),
  ])
  const r = rows[0]
  if (!r) return null
  return {
    id: Number(r.id),
    publicId: String(r.public_id),
    orderId: Number(r.order_id),
    orderPublicId: String(r.order_public_id),
    methodId: Number(r.payment_method_id),
    amount: Number(r.amount),
    currency: String(r.currency),
    state: String(r.state),
    reference: r.provider_reference == null ? null : String(r.provider_reference),
    providerRefunded: Number(r.refunded_amount),
    externalRefunded: Number(r.external_refunded_amount),
    orderGross: Number(r.total_gross),
    taxLines: taxes.map((t) => ({
      orderLineId: t.order_line_id == null ? null : Number(t.order_line_id),
      rateBp: Number(t.rate_bp),
      amount: Number(t.amount),
    })),
  }
}

export function assertAmount(amount: number): void {
  if (!Number.isSafeInteger(amount) || amount < 1) {
    throw new PaymentError("INVALID_INPUT", "amount must be a positive integer")
  }
}

export type RefundRow = {
  publicId: string
  amount: number
  state: "pending" | "settled"
  source: "admin" | "provider" | "manual"
  reason?: string | null
  idempotencyKey?: string | null
  providerEventId?: string | null
  providerRefundId?: string | null
}

/** `INSERT refunds … WHERE guard ON CONFLICT DO NOTHING` (event/refund/idempotency uniqueness). */
export function insertRefund(ctx: RefundCtx, pay: LoadedPayment, row: RefundRow, guard: SQL) {
  const lines = allocateRefundTax(
    Math.min(row.amount, pay.orderGross),
    pay.orderGross,
    pay.taxLines,
  )
  const stmt = guardedInsertStatement(
    refunds,
    {
      ...row,
      paymentId: pay.id,
      orderId: pay.orderId,
      currency: pay.currency,
      lines: lines.lines,
      createdAt: ctx.now,
      updatedAt: ctx.now,
    },
    guard,
  )
  return { ...stmt, sql: `${stmt.sql} on conflict do nothing` }
}

export const refundExists = (publicId: string, state?: string) =>
  state
    ? sql`EXISTS (SELECT 1 FROM "refunds" WHERE "public_id" = ${publicId} AND "state" = ${state})`
    : sql`EXISTS (SELECT 1 FROM "refunds" WHERE "public_id" = ${publicId})`

/**
 * Tail of every money-moving refund write: e-invoice refund outbox step (guarded), the caller's
 * writes (payment update; the guard-flipping statement last), then the cached order payment
 * status (idempotent, after the payment update).
 */
export function refundTail(
  ctx: RefundCtx,
  pay: LoadedPayment,
  refundPublicId: string,
  guard: SQL,
  writes: readonly AtomicStatement[],
): AtomicStatement[] {
  return [
    enqueueStatement(
      ctx.platform.db,
      {
        kind: "invoice",
        event: "refund.settled",
        payload: { refund: refundPublicId, payment: pay.publicId, order: pay.orderPublicId },
      },
      ctx.now,
      guard,
    ),
    ...writes,
    refreshDerivedState(pay.orderId, ctx.now),
  ]
}

/** Existing refund by client key (double click / resend returns the first one). */
export async function refundByKey(platform: Pick<Platform, "batch">, key: string) {
  const [rows = []] = await platform.batch([
    sqlStatement(sql`SELECT "public_id", "state" FROM "refunds" WHERE "idempotency_key" = ${key}`),
  ])
  const r = rows[0]
  return r ? { publicId: String(r.public_id), state: String(r.state) } : null
}
