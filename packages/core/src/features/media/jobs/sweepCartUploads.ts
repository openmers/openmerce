import { sql } from "drizzle-orm"
import { sqlStatement } from "../../../platform"
import type { MediaCtx } from "../types"
import { removeRows, SWEEP_LIMIT } from "./removeRows"

/**
 * Personalization images of carts that were never bought: the cart is gone or past `expires_at`
 * and no order was placed from it. Images of purchased carts stay (order lines reference them).
 */
export async function sweepCartUploads(
  ctx: MediaCtx,
  input: { limit?: number } = {},
): Promise<number> {
  const abandoned = sql`"owner_kind" = 'cart'
    AND NOT EXISTS (SELECT 1 FROM "carts" c WHERE c."id" = "media"."owner_id"
      AND c."expires_at" > ${ctx.now})
    AND NOT EXISTS (SELECT 1 FROM "checkout_reservations" r
      JOIN "orders" o ON o."reservation_id" = r."id" WHERE r."cart_id" = "media"."owner_id")`
  const [rows = []] = await ctx.platform.batch([
    sqlStatement(sql`SELECT "id", "key", "sizes" FROM "media" WHERE ${abandoned}
      LIMIT ${input.limit ?? SWEEP_LIMIT}`),
  ])
  return removeRows(ctx, rows, abandoned)
}
