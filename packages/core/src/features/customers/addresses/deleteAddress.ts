import { addresses, customers } from "@openmers/db"
import { and, eq, sql } from "drizzle-orm"
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core"
import { affected } from "../../../platform"
import type { CustomersCtx } from "../types"
import {
  type AddressWriteBase,
  addressOf,
  bumpCustomer,
  classifyAddressMiss,
  customerAtVersion,
} from "./statements"

export type DeleteAddressInput = AddressWriteBase & { publicId: string }

/**
 * Deletes an address of this customer. A default that points to it is cleared (no other address is picked
 * automatically). Order inside one `atomic()`: clear the defaults (the FK forbids deleting a referenced row),
 * delete, then bump the version guarded by "the address is gone"; all three share the old-version condition.
 */
export async function deleteAddress(
  ctx: CustomersCtx,
  input: DeleteAddressInput,
): Promise<{ version: number }> {
  const p = ctx.platform
  const [row] = await p.db
    .select({ id: addresses.id })
    .from(addresses)
    .where(and(eq(addresses.publicId, input.publicId), eq(addresses.customerId, input.customerId)))
    .limit(1)
  if (!row) await classifyAddressMiss(p.db, input, input.publicId)
  const id = row?.id ?? 0
  const clearIf = (column: AnySQLiteColumn) =>
    sql`CASE WHEN ${column} = ${id} THEN NULL ELSE ${column} END`
  const stmts = [
    p.db
      .update(customers)
      .set({
        defaultShippingAddressId: clearIf(customers.defaultShippingAddressId),
        defaultBillingAddressId: clearIf(customers.defaultBillingAddressId),
      })
      .where(and(eq(customers.id, input.customerId), eq(customers.version, input.version)))
      .toSQL(),
    p.db
      .delete(addresses)
      .where(
        and(
          eq(addresses.id, id),
          eq(addresses.customerId, input.customerId),
          customerAtVersion(input.customerId, input.version),
        ),
      )
      .toSQL(),
    bumpCustomer(p.db, input, ctx.now, sql`NOT ${addressOf(input.customerId, input.publicId)}`),
  ]
  const result = await p.atomic(stmts)
  if (!affected(result, 2)) await classifyAddressMiss(p.db, input, input.publicId)
  return { version: input.version + 1 }
}
