import { addresses, customers } from "@openmers/db"
import { and, eq, type SQL, sql } from "drizzle-orm"
import type { SQLiteUpdateSetSource } from "drizzle-orm/sqlite-core"
import type { AtomicStatement, Db } from "../../../platform"
import { CustomerError } from "../types"
import type { Address } from "./schemas"

/** At most 20 addresses per customer (11-musteriler §4). */
export const ADDRESS_LIMIT = 20

/** Address writes are guarded by the customer row's `version` (the address table has no own counter). */
export type AddressWriteBase = { customerId: number; version: number }

export function customerAtVersion(customerId: number, version: number): SQL {
  return sql`EXISTS (SELECT 1 FROM ${customers}
    WHERE ${customers.id} = ${customerId} AND ${customers.version} = ${version})`
}

/** Ownership filter: the address belongs to this customer (another customer's address is "not found"). */
export function addressOf(customerId: number, publicId: string): SQL {
  return sql`EXISTS (SELECT 1 FROM ${addresses}
    WHERE ${addresses.publicId} = ${publicId} AND ${addresses.customerId} = ${customerId})`
}

export function addressIdOf(customerId: number, publicId: string): SQL {
  return sql`(SELECT ${addresses.id} FROM ${addresses}
    WHERE ${addresses.publicId} = ${publicId} AND ${addresses.customerId} = ${customerId})`
}

export function addressColumns(a: Address) {
  return {
    label: a.label ?? null,
    firstName: a.firstName ?? null,
    lastName: a.lastName ?? null,
    company: a.company ?? null,
    addressLine1: a.addressLine1,
    addressLine2: a.addressLine2 ?? null,
    city: a.city,
    region: a.region ?? null,
    district: a.district ?? null,
    postalCode: a.postalCode ?? null,
    country: a.country,
    phone: a.phone ?? null,
    taxId: a.taxId ?? null,
    taxIdType: a.taxIdType ?? null,
    customFields: a.customFields ?? null,
  }
}

/** Version bump of the customer row; always the **last** statement (see `updateProduct`). */
export function bumpCustomer(
  db: Db,
  base: AddressWriteBase,
  now: number,
  guard: SQL,
  set: SQLiteUpdateSetSource<typeof customers> = {},
): AtomicStatement {
  return db
    .update(customers)
    .set({ ...set, version: sql`${customers.version} + 1`, updatedAt: now })
    .where(and(eq(customers.id, base.customerId), eq(customers.version, base.version), guard))
    .toSQL()
}

/** A guarded write touched nothing: customer/address missing → `NOT_FOUND`, otherwise stale version. */
export async function classifyAddressMiss(
  db: Db,
  base: AddressWriteBase,
  addressPublicId?: string,
): Promise<never> {
  const [customer] = await db
    .select({ version: customers.version })
    .from(customers)
    .where(eq(customers.id, base.customerId))
    .limit(1)
  if (!customer) throw new CustomerError("NOT_FOUND", "customer not found")
  if (addressPublicId) {
    const [row] = await db
      .select({ id: addresses.id })
      .from(addresses)
      .where(
        and(eq(addresses.publicId, addressPublicId), eq(addresses.customerId, base.customerId)),
      )
      .limit(1)
    if (!row) throw new CustomerError("NOT_FOUND", "address not found")
  }
  if (customer.version !== base.version || addressPublicId) {
    throw new CustomerError("CONFLICT", "version conflict: the customer changed")
  }
  // Only the add path passes no address id: the remaining guard is the 20 limit.
  throw new CustomerError("LIMIT_EXCEEDED", `at most ${ADDRESS_LIMIT} addresses per customer`)
}
