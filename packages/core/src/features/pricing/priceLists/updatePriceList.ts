import { priceLists } from "@openmers/db"
import { and, eq, type SQL, sql } from "drizzle-orm"
import { type AtomicStatement, affected } from "../../../platform"
import { auditStatement } from "../../audit"
import { auditActorOf } from "../../catalog/products/types"
import { assertWindow, type PricingCtx, PricingError } from "../types"
import { findPriceList, priceListGuard } from "./statements"

/** Changeable fields; `currency` and `type` are fixed (open a new list instead). */
export type PriceListPatch = {
  name?: string
  priority?: number
  startsAt?: number | null
  endsAt?: number | null
  includesTax?: boolean
}

function patchOf(input: PriceListPatch): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  if (input.name !== undefined) {
    const name = input.name.trim()
    if (name.length === 0) throw new PricingError("INVALID_INPUT", "liste adı boş olamaz")
    patch.name = name
  }
  if (input.priority !== undefined) {
    if (!Number.isSafeInteger(input.priority)) {
      throw new PricingError("INVALID_INPUT", "geçersiz öncelik")
    }
    patch.priority = input.priority
  }
  if (input.startsAt !== undefined) patch.startsAt = input.startsAt
  if (input.endsAt !== undefined) patch.endsAt = input.endsAt
  if (input.includesTax !== undefined) patch.includesTax = input.includesTax
  return patch
}

/**
 * Writes only the given fields; the audit row is in the same `atomic()` and bound to the same condition.
 * If only one date is given, the validity window is checked against the stored other date in the SQL condition
 * (no read-decide-write): if the window would break, no row is written, `INVALID_INPUT`.
 */
export async function updatePriceList(
  ctx: PricingCtx,
  input: { publicId: string; patch: PriceListPatch },
): Promise<{ publicId: string }> {
  const p = ctx.platform
  const patch = patchOf(input.patch)
  assertWindow(input.patch.startsAt, input.patch.endsAt)
  if (Object.keys(patch).length === 0) throw new PricingError("INVALID_INPUT", "değişiklik yok")

  const starts: SQL =
    input.patch.startsAt !== undefined ? sql`${input.patch.startsAt}` : sql`${priceLists.startsAt}`
  const ends: SQL =
    input.patch.endsAt !== undefined ? sql`${input.patch.endsAt}` : sql`${priceLists.endsAt}`
  const windowOk = sql`(${starts} IS NULL OR ${ends} IS NULL OR ${starts} < ${ends})`
  const guard = priceListGuard(input.publicId, ctx.channel.id, windowOk)

  const stmts: AtomicStatement[] = [
    auditStatement(
      p.db,
      {
        actor: auditActorOf(ctx),
        action: "prices:write",
        entityType: "price_list",
        entityPublicId: input.publicId,
        channelId: ctx.channel.id,
        after: { publicId: input.publicId, fields: Object.keys(patch) },
        requestId: ctx.requestId,
      },
      ctx.now,
      guard,
    ),
    p.db
      .update(priceLists)
      .set({ ...patch, updatedAt: ctx.now })
      .where(
        and(
          eq(priceLists.publicId, input.publicId),
          eq(priceLists.channelId, ctx.channel.id),
          windowOk,
        ),
      )
      .toSQL(),
  ]

  const result = await p.atomic(stmts)
  if (!affected(result, stmts.length - 1)) {
    await findPriceList(p.db, input.publicId, ctx.channel.id)
    throw new PricingError("INVALID_INPUT", "başlangıç bitişten önce olmalı")
  }
  return { publicId: input.publicId }
}
