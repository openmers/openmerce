import { addresses, customers } from "@openmers/db"
import { asc, eq } from "drizzle-orm"
import type { Platform } from "../../../platform"

export type AccountProfile = {
  publicId: string
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  locale: string | null
  version: number
}

export type AccountAddress = {
  publicId: string
  label: string | null
  firstName: string | null
  lastName: string | null
  company: string | null
  addressLine1: string
  addressLine2: string | null
  city: string
  region: string | null
  district: string | null
  postalCode: string | null
  country: string
  phone: string | null
  taxId: string | null
  taxIdType: string | null
  isDefaultShipping: boolean
  isDefaultBilling: boolean
}

/** The signed-in customer's own profile; the caller passes the session's customer id (ownership). */
export async function getAccountProfile(
  p: Pick<Platform, "db">,
  customerId: number,
): Promise<AccountProfile | null> {
  const [row] = await p.db
    .select({
      publicId: customers.publicId,
      email: customers.email,
      firstName: customers.firstName,
      lastName: customers.lastName,
      phone: customers.phone,
      locale: customers.locale,
      version: customers.version,
    })
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1)
  return row ?? null
}

/** Address book of this customer (≤ 20 rows) with the version address writes must send. */
export async function listAccountAddresses(
  p: Pick<Platform, "db">,
  customerId: number,
): Promise<{ version: number; items: AccountAddress[] } | null> {
  const [customer] = await p.db
    .select({
      version: customers.version,
      shipping: customers.defaultShippingAddressId,
      billing: customers.defaultBillingAddressId,
    })
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1)
  if (!customer) return null
  const rows = await p.db
    .select()
    .from(addresses)
    .where(eq(addresses.customerId, customerId))
    .orderBy(asc(addresses.id))
  const items = rows.map(
    ({ id, customerId: _c, customFields: _f, createdAt: _a, updatedAt: _u, ...a }) => ({
      ...a,
      isDefaultShipping: id === customer.shipping,
      isDefaultBilling: id === customer.billing,
    }),
  )
  return { version: customer.version, items }
}
