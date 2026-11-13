import { sql } from "drizzle-orm"
import { affected, type Platform, sqlStatement } from "../../../platform"
import { newPublicId } from "../../ids"
import type { CartAddress } from "../queries/cartData"
import { type CartCtx, CartError } from "../types"

/** Abandoned carts expire after this (the cleanup job reads `carts_expires_idx`). */
export const CART_TTL_MS = 30 * 86_400_000

export type CreateCartInput = { channelId: number; currency: string; customerId?: number | null }

/** New empty `active` cart; returns its public id. */
export async function createCart(ctx: CartCtx, input: CreateCartInput): Promise<string> {
  const publicId = newPublicId("cart_")
  await ctx.platform.atomic([
    sqlStatement(sql`INSERT INTO "carts" ("public_id", "channel_id", "customer_id", "currency",
        "coupon_codes", "expires_at", "created_at", "updated_at")
      VALUES (${publicId}, ${input.channelId}, ${input.customerId ?? null}, ${input.currency}, '[]',
        ${ctx.now + CART_TTL_MS}, ${ctx.now}, ${ctx.now})`),
  ])
  return publicId
}

/** The customer's newest `active` cart in the channel (`carts_customer_status_idx`). */
export async function findCustomerCart(
  p: Pick<Platform, "batch">,
  input: { customerId: number; channelId: number },
): Promise<string | null> {
  const [rows = []] = await p.batch([
    sqlStatement(sql`SELECT "public_id" FROM "carts" WHERE "customer_id" = ${input.customerId}
      AND "status" = 'active' AND "channel_id" = ${input.channelId} ORDER BY "id" DESC LIMIT 1`),
  ])
  return rows[0] ? String(rows[0].public_id) : null
}

/** Binds a guest cart (no customer yet) to a customer on sign-in; `false` if it was not a guest cart. */
export async function adoptCart(
  ctx: CartCtx,
  input: { cartPublicId: string; customerId: number },
): Promise<boolean> {
  const result = await ctx.platform.atomic([
    sqlStatement(sql`UPDATE "carts" SET "customer_id" = ${input.customerId},
        "version" = "version" + 1, "updated_at" = ${ctx.now}
      WHERE "public_id" = ${input.cartPublicId} AND "customer_id" IS NULL AND "status" = 'active'`),
  ])
  return affected(result, 0)
}

export type CartPatch = {
  couponCodes?: string[]
  shippingMethodId?: number | null
  shippingAddress?: CartAddress | null
  billingAddress?: CartAddress | null
  email?: string | null
}

const json = (v: unknown) => (v === null ? null : JSON.stringify(v))

/**
 * Cart header fields (coupons, shipping method, addresses, email) in one conditional write bound
 * to the `version` the caller saw (read once when omitted). `CART_CHANGED` if it moved.
 */
export async function updateCart(
  ctx: CartCtx,
  input: { cartPublicId: string; version?: number; patch: CartPatch },
): Promise<{ version: number }> {
  let version = input.version
  if (version === undefined) {
    const [rows = []] = await ctx.platform.batch([
      sqlStatement(sql`SELECT "version" FROM "carts" WHERE "public_id" = ${input.cartPublicId}`),
    ])
    if (!rows[0]) throw new CartError("NOT_FOUND", "cart not found")
    version = Number(rows[0].version)
  }
  const { patch } = input
  const sets = [
    patch.couponCodes !== undefined && sql`"coupon_codes" = ${JSON.stringify(patch.couponCodes)}`,
    patch.shippingMethodId !== undefined && sql`"shipping_method_id" = ${patch.shippingMethodId}`,
    patch.shippingAddress !== undefined && sql`"shipping_address" = ${json(patch.shippingAddress)}`,
    patch.billingAddress !== undefined && sql`"billing_address" = ${json(patch.billingAddress)}`,
    patch.email !== undefined && sql`"email" = ${patch.email}`,
  ].filter((s) => s !== false)
  const result = await ctx.platform.atomic([
    sqlStatement(sql`UPDATE "carts" SET ${sql.join(
      [...sets, sql`"version" = "version" + 1`, sql`"updated_at" = ${ctx.now}`],
      sql`, `,
    )} WHERE "public_id" = ${input.cartPublicId} AND "version" = ${version}
      AND "status" = 'active'`),
  ])
  if (!affected(result, 0)) throw new CartError("CART_CHANGED", "cart changed")
  return { version: version + 1 }
}
