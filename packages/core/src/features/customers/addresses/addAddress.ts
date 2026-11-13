import { addresses } from "@openmers/db"
import { sql } from "drizzle-orm"
import { affected, guardedInsertStatement } from "../../../platform"
import { newPublicId } from "../../ids"
import type { CustomersCtx } from "../types"
import { parseAddress } from "./schemas"
import {
  ADDRESS_LIMIT,
  type AddressWriteBase,
  addressColumns,
  addressIdOf,
  addressOf,
  bumpCustomer,
  classifyAddressMiss,
  customerAtVersion,
} from "./statements"

export type AddAddressInput = AddressWriteBase & {
  address: unknown
  /** Also make it the default shipping / billing address. */
  defaultShipping?: boolean
  defaultBilling?: boolean
}

/**
 * Adds an address: a single `atomic()` with a conditional `INSERT ... SELECT` (customer at the expected
 * version and under 20 addresses), then the customer `version` bump guarded by the new row's existence.
 */
export async function addAddress(
  ctx: CustomersCtx,
  input: AddAddressInput,
): Promise<{ publicId: string; version: number }> {
  const p = ctx.platform
  const address = parseAddress(input.address)
  const publicId = newPublicId("adr_")
  const count = sql`(SELECT count(*) FROM ${addresses} WHERE ${addresses.customerId} = ${input.customerId})`
  const id = addressIdOf(input.customerId, publicId)
  const stmts = [
    guardedInsertStatement(
      addresses,
      {
        publicId,
        customerId: input.customerId,
        ...addressColumns(address),
        createdAt: ctx.now,
        updatedAt: ctx.now,
      },
      sql`${customerAtVersion(input.customerId, input.version)} AND ${count} < ${ADDRESS_LIMIT}`,
    ),
    bumpCustomer(p.db, input, ctx.now, addressOf(input.customerId, publicId), {
      ...(input.defaultShipping ? { defaultShippingAddressId: id } : {}),
      ...(input.defaultBilling ? { defaultBillingAddressId: id } : {}),
    }),
  ]
  const result = await p.atomic(stmts)
  if (!affected(result, 1)) await classifyAddressMiss(p.db, input)
  return { publicId, version: input.version + 1 }
}
