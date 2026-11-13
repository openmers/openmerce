import { orderEvents } from "@openmers/db"
import { type SQL, sql } from "drizzle-orm"
import {
  type AtomicStatement,
  affected,
  guardedInsertStatement,
  type Platform,
  sqlStatement,
} from "../../../platform"
import { enqueueStatement } from "../../outbox"
import { OrderError, type OrderState } from "../types"
import { canTransition } from "./transitions"

export type TransitionInput = {
  orderPublicId: string
  from: OrderState
  to: OrderState
  actor?: Record<string, unknown>
  data?: Record<string, unknown>
  /** App guard hook; throwing aborts before anything is written. */
  guard?: (t: { orderPublicId: string; from: OrderState; to: OrderState }) => void | Promise<void>
  /** Caller statements bound to the same transition (e.g. stock release on cancel). */
  extra?: (won: SQL) => AtomicStatement[]
}

/**
 * Transition (07-siparis §3) in one `atomic()`: event row, outbox event and caller statements are
 * guarded by `state = :from` and come first; the `UPDATE` that flips the state goes last, so every
 * statement sees the same pre-state. A wrong expected state writes nothing. Returns whether this
 * call moved the order.
 */
export async function applyTransition(
  ctx: { platform: Pick<Platform, "atomic" | "db">; now: number },
  input: TransitionInput,
): Promise<boolean> {
  if (!canTransition(input.from, input.to)) {
    throw new OrderError("INVALID_TRANSITION", `${input.from} -> ${input.to} is not allowed`)
  }
  await input.guard?.({ orderPublicId: input.orderPublicId, from: input.from, to: input.to })
  const id = sql`(SELECT "id" FROM "orders" WHERE "public_id" = ${input.orderPublicId})`
  const won = sql`EXISTS (SELECT 1 FROM "orders" WHERE "public_id" = ${input.orderPublicId}
    AND "state" = ${input.from})`
  const stmts = [
    guardedInsertStatement(
      orderEvents,
      {
        orderId: id,
        kind: "state",
        fromState: input.from,
        toState: input.to,
        actor: input.actor,
        data: input.data,
        createdAt: ctx.now,
      },
      won,
    ),
    enqueueStatement(
      ctx.platform.db,
      {
        kind: "event",
        event: `order.${input.to}`,
        payload: { order: input.orderPublicId, from: input.from, to: input.to },
      },
      ctx.now,
      won,
    ),
    ...(input.extra?.(won) ?? []),
    sqlStatement(sql`UPDATE "orders" SET "state" = ${input.to}, "updated_at" = ${ctx.now}
      WHERE "public_id" = ${input.orderPublicId} AND "state" = ${input.from}`),
  ]
  const result = await ctx.platform.atomic(stmts)
  return affected(result, stmts.length - 1)
}
