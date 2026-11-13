import { type SQL, sql } from "drizzle-orm"
import type { CtxActor } from "../../../ctx"
import { type AtomicStatement, type Platform, sqlStatement } from "../../../platform"
import { auditStatement } from "../../audit"
import { auditActorOf } from "../../customers/account/auditActor"
import { OrderError, type OrderState } from "../types"
import { applyTransition } from "./applyTransition"

export type OrderAdminCtx = {
  platform: Pick<Platform, "atomic" | "batch" | "db">
  now: number
  actor: CtxActor
  requestId: string
  channelId: number
}

/** Audit row bound to the transition's `won` condition (no move, no audit). */
export function orderAudit(
  ctx: OrderAdminCtx,
  orderPublicId: string,
  after: Record<string, unknown>,
  won: SQL,
): AtomicStatement {
  return auditStatement(
    ctx.platform.db,
    {
      actor: auditActorOf(ctx.actor),
      action: "orders:write",
      entityType: "order",
      entityPublicId: orderPublicId,
      channelId: ctx.channelId,
      after,
      requestId: ctx.requestId,
    },
    ctx.now,
    won,
  )
}

/** Current state of a channel's order; `NOT_FOUND` outside the channel. */
export async function readOrderState(
  ctx: Pick<OrderAdminCtx, "platform" | "channelId">,
  orderPublicId: string,
): Promise<OrderState> {
  const [rows = []] = await ctx.platform.batch([
    sqlStatement(sql`SELECT "state" FROM "orders" WHERE "public_id" = ${orderPublicId}
      AND "channel_id" = ${ctx.channelId}`),
  ])
  if (!rows[0]) throw new OrderError("NOT_FOUND", "order not found")
  return rows[0].state as OrderState
}

/**
 * Admin state move (07-siparis §3) from the state read now; cancellation has its own flow
 * (`cancelOrder`: stock and refunds). Returns whether this call moved the order.
 */
export async function transitionOrder(
  ctx: OrderAdminCtx,
  input: { orderPublicId: string; to: Exclude<OrderState, "cancelled" | "placed"> },
): Promise<boolean> {
  const from = await readOrderState(ctx, input.orderPublicId)
  return applyTransition(ctx, {
    orderPublicId: input.orderPublicId,
    from,
    to: input.to,
    actor: { type: ctx.actor.type, id: ctx.actor.id },
    extra: (won) => [orderAudit(ctx, input.orderPublicId, { from, to: input.to }, won)],
  })
}
