import { customers, users } from "@openmers/db"
import { and, eq, isNull, ne, sql } from "drizzle-orm"
import { insertWithPublicId } from "../../ids"
import { normalizeEmail } from "../email/normalizeEmail"
import type { CustomersCtx } from "../types"

export type LinkedCustomer = { customerId: number; publicId: string }

/**
 * Binds `customers.user_id` after the account's email is verified (11-musteriler §3). Before that the
 * customer row (and its guest orders) stays unbound, so signing up with someone else's email reveals
 * nothing. The guest row for the same email is reused (one row per email); if there is none, a
 * `source = register` row is created. Returns `null` when the user is not verified, the row is already
 * bound to another user, or the customer is anonymized.
 */
export async function linkUserOnVerified(
  ctx: CustomersCtx,
  input: { userId: number },
): Promise<LinkedCustomer | null> {
  const p = ctx.platform
  const [user] = await p.db
    .select({ email: users.email, verified: users.emailVerified })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1)
  if (!user?.verified) return null
  const emailNormalized = normalizeEmail(user.email)
  // The verified flag is checked again inside the write: a concurrent email change cannot slip through.
  const verified = sql`EXISTS (SELECT 1 FROM ${users} WHERE ${users.id} = ${input.userId}
    AND ${users.emailVerified} = 1)`

  await insertWithPublicId(
    p,
    (publicId) => [
      p.db
        .insert(customers)
        .values({
          publicId,
          email: user.email,
          emailNormalized,
          source: "register",
          createdAt: ctx.now,
          updatedAt: ctx.now,
        })
        .onConflictDoNothing({ target: customers.emailNormalized })
        .toSQL(),
      p.db
        .update(customers)
        .set({
          userId: input.userId,
          emailVerifiedAt: sql`coalesce(${customers.emailVerifiedAt}, ${ctx.now})`,
          version: sql`${customers.version} + 1`,
          updatedAt: ctx.now,
        })
        .where(
          and(
            eq(customers.emailNormalized, emailNormalized),
            isNull(customers.userId),
            ne(customers.state, "anonymized"),
            verified,
            sql`NOT EXISTS (SELECT 1 FROM ${customers} c2 WHERE c2.user_id = ${input.userId})`,
          ),
        )
        .toSQL(),
    ],
    { prefix: "cus_" },
  )

  const [row] = await p.db
    .select({ id: customers.id, publicId: customers.publicId })
    .from(customers)
    .where(and(eq(customers.userId, input.userId), ne(customers.state, "anonymized")))
    .limit(1)
  return row ? { customerId: row.id, publicId: row.publicId } : null
}
