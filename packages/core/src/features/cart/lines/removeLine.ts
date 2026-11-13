import { sql } from "drizzle-orm"
import { sqlStatement } from "../../../platform"
import { type CartCtx, CartError } from "../types"
import { cartGuard, loadForWrite, writeLines } from "./shared"

export type RemoveLineInput = {
  cartPublicId: string
  variantPublicId: string
  lineKey: string
  version?: number
}

/** Deletes a line; single `atomic()` bound to the cart `version`. `NOT_FOUND` if missing. */
export async function removeLine(
  ctx: CartCtx,
  input: RemoveLineInput,
): Promise<{ version: number }> {
  const { cart, line } = await loadForWrite(ctx, input)
  if (!line) throw new CartError("NOT_FOUND", "sepet satırı yok")
  const stmt = sqlStatement(sql`DELETE FROM "cart_lines" WHERE "id" = ${line.id}
    AND ${cartGuard(cart)}`)
  return writeLines(ctx, cart, [stmt])
}
