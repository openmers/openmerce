import { addresses } from "@openmers/db"
import { and, eq } from "drizzle-orm"
import { affected } from "../../../platform"
import type { CustomersCtx } from "../types"
import { parseAddress } from "./schemas"
import {
  type AddressWriteBase,
  addressColumns,
  addressOf,
  bumpCustomer,
  classifyAddressMiss,
  customerAtVersion,
} from "./statements"

export type UpdateAddressInput = AddressWriteBase & { publicId: string; address: unknown }

/** Replaces an address of this customer; `version`-guarded, the customer bump is the last statement. */
export async function updateAddress(
  ctx: CustomersCtx,
  input: UpdateAddressInput,
): Promise<{ publicId: string; version: number }> {
  const p = ctx.platform
  const address = parseAddress(input.address)
  const stmts = [
    p.db
      .update(addresses)
      .set({ ...addressColumns(address), updatedAt: ctx.now })
      .where(
        and(
          eq(addresses.publicId, input.publicId),
          eq(addresses.customerId, input.customerId),
          customerAtVersion(input.customerId, input.version),
        ),
      )
      .toSQL(),
    bumpCustomer(p.db, input, ctx.now, addressOf(input.customerId, input.publicId)),
  ]
  const result = await p.atomic(stmts)
  if (!affected(result, 1)) await classifyAddressMiss(p.db, input, input.publicId)
  return { publicId: input.publicId, version: input.version + 1 }
}
