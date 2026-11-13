import { customerChannels, customers } from "@openmers/db"
import { eq, sql } from "drizzle-orm"
import { insertWithPublicId } from "../../ids"
import type { CustomersCtx } from "../types"
import { normalizeEmail } from "./normalizeEmail"

export type UpsertCheckoutCustomerInput = {
  email: string
  channelId: number
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  locale?: string | null
}

export type UpsertCheckoutCustomerResult = {
  customerId: number
  publicId: string
  created: boolean
}

/**
 * Guest checkout (11-musteriler §3): finds the customer by `email_normalized`, otherwise creates a guest row
 * (`user_id` empty, `source = checkout`). An existing row is **never** changed: without login, checkout does
 * not touch the profile or the address book (the order keeps its own address snapshot). Marketplace
 * customers are written by their own import path with `source = marketplace`; this function never creates them.
 * The unique index on `email_normalized` decides races (`ON CONFLICT DO NOTHING`, then read).
 */
export async function upsertCheckoutCustomer(
  ctx: CustomersCtx,
  input: UpsertCheckoutCustomerInput,
): Promise<UpsertCheckoutCustomerResult> {
  const p = ctx.platform
  const emailNormalized = normalizeEmail(input.email)
  const customerId = sql`(SELECT ${customers.id} FROM ${customers} WHERE ${customers.emailNormalized} = ${emailNormalized})`
  const generated = await insertWithPublicId(
    p,
    (publicId) => [
      p.db
        .insert(customers)
        .values({
          publicId,
          email: input.email.trim(),
          emailNormalized,
          firstName: input.firstName ?? null,
          lastName: input.lastName ?? null,
          phone: input.phone ?? null,
          locale: input.locale ?? null,
          source: "checkout",
          createdAt: ctx.now,
          updatedAt: ctx.now,
        })
        .onConflictDoNothing({ target: customers.emailNormalized })
        .toSQL(),
      p.db
        .insert(customerChannels)
        .values({ customerId, channelId: input.channelId, createdAt: ctx.now })
        .onConflictDoNothing()
        .toSQL(),
    ],
    { prefix: "cus_" },
  )
  const [row] = await p.db
    .select({ id: customers.id, publicId: customers.publicId })
    .from(customers)
    .where(eq(customers.emailNormalized, emailNormalized))
    .limit(1)
  if (!row) throw new Error("checkout customer row missing after upsert")
  return { customerId: row.id, publicId: row.publicId, created: row.publicId === generated }
}
