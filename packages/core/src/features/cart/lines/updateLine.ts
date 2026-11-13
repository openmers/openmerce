import { sql } from "drizzle-orm"
import { sqlStatement } from "../../../platform"
import { lineKey } from "../personalization/lineKey"
import { type CartCtx, CartError } from "../types"
import {
  assertQuantity,
  cartGuard,
  loadForWrite,
  upsertLine,
  validateFor,
  writeLines,
} from "./shared"

export type UpdateLineInput = {
  cartPublicId: string
  variantPublicId: string
  lineKey: string
  quantity: number
  /** Omitted: personalization unchanged; given: validated again. */
  personalization?: unknown
  version?: number
}

/**
 * Edits quantity and/or personalization (05-sepet §1.1 "Editing"). If `line_key` changes the old
 * line is deleted and re-added under the new key (merging with an existing line of that key), all
 * in one `atomic()` bound to the cart `version`.
 */
export async function updateLine(
  ctx: CartCtx,
  input: UpdateLineInput,
): Promise<{ version: number; lineKey: string }> {
  assertQuantity(input.quantity)
  const { cart, variant, line } = await loadForWrite(ctx, input)
  if (!line) throw new CartError("NOT_FOUND", "sepet satırı yok")
  const where = sql`"id" = ${line.id} AND ${cartGuard(cart)}`

  if (input.personalization === undefined) {
    const stmt = sqlStatement(sql`UPDATE "cart_lines" SET "quantity" = ${input.quantity},
      "updated_at" = ${ctx.now} WHERE ${where}`)
    return { ...(await writeLines(ctx, cart, [stmt])), lineKey: input.lineKey }
  }

  const personalization = await validateFor(ctx, cart, variant, input.personalization)
  const key = await lineKey(personalization)
  const value = personalization ? JSON.stringify(personalization) : null
  if (key === input.lineKey) {
    const stmt = sqlStatement(sql`UPDATE "cart_lines" SET "quantity" = ${input.quantity},
      "personalization" = ${value}, "updated_at" = ${ctx.now} WHERE ${where}`)
    return { ...(await writeLines(ctx, cart, [stmt])), lineKey: key }
  }
  const stmts = [
    upsertLine(cart, {
      variantId: variant.id,
      quantity: input.quantity,
      personalization,
      lineKey: key,
      now: ctx.now,
    }),
    sqlStatement(sql`DELETE FROM "cart_lines" WHERE ${where}`),
  ]
  return { ...(await writeLines(ctx, cart, stmts)), lineKey: key }
}
