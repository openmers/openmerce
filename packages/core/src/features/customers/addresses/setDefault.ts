import { affected } from "../../../platform"
import type { CustomersCtx } from "../types"
import {
  type AddressWriteBase,
  addressIdOf,
  addressOf,
  bumpCustomer,
  classifyAddressMiss,
} from "./statements"

export type SetDefaultAddressInput = AddressWriteBase & {
  publicId: string
  kind: "shipping" | "billing"
}

/** Default addresses live on the customer row: structurally one default per kind, one guarded `UPDATE`. */
export async function setDefaultAddress(
  ctx: CustomersCtx,
  input: SetDefaultAddressInput,
): Promise<{ version: number }> {
  const p = ctx.platform
  const id = addressIdOf(input.customerId, input.publicId)
  const set =
    input.kind === "shipping" ? { defaultShippingAddressId: id } : { defaultBillingAddressId: id }
  const stmts = [
    bumpCustomer(p.db, input, ctx.now, addressOf(input.customerId, input.publicId), set),
  ]
  const result = await p.atomic(stmts)
  if (!affected(result, 0)) await classifyAddressMiss(p.db, input, input.publicId)
  return { version: input.version + 1 }
}
