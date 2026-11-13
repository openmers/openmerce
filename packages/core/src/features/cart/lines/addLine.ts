import { lineKey } from "../personalization/lineKey"
import type { CartCtx } from "../types"
import { assertQuantity, loadForWrite, upsertLine, validateFor, writeLines } from "./shared"

export type AddLineInput = {
  cartPublicId: string
  variantPublicId: string
  quantity: number
  personalization?: unknown
  /** Not part of `line_key`; when merging into an existing line the new value wins. */
  customFields?: Record<string, unknown>
  /** Cart version the caller saw; defaults to the one read. */
  version?: number
}

/**
 * Adds a line (05-sepet §1): one conditional write; same variant + same personalization adds
 * quantity. Stock is not reserved here. Returns the new cart version; `CART_CHANGED` if the cart
 * changed in between.
 */
export async function addLine(
  ctx: CartCtx,
  input: AddLineInput,
): Promise<{ version: number; lineKey: string }> {
  assertQuantity(input.quantity)
  const { cart, variant } = await loadForWrite(ctx, input)
  const personalization = await validateFor(ctx, cart, variant, input.personalization)
  const key = await lineKey(personalization)
  const stmt = upsertLine(cart, {
    variantId: variant.id,
    quantity: input.quantity,
    personalization,
    customFields: input.customFields,
    lineKey: key,
    now: ctx.now,
  })
  const { version } = await writeLines(ctx, cart, [stmt])
  return { version, lineKey: key }
}
