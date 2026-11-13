import { type SQL, sql } from "drizzle-orm"
import { type AtomicStatement, affected, sqlStatement } from "../../../platform"
import { effectiveDefinition } from "../personalization/schema"
import { type MediaInfo, validatePersonalization } from "../personalization/validate"
import { type CartCtx, CartError } from "../types"

export const MAX_LINE_QUANTITY = 9999

export function assertQuantity(quantity: number): void {
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_LINE_QUANTITY) {
    throw new CartError("INVALID_INPUT", `adet 1-${MAX_LINE_QUANTITY} arası tamsayı olmalı`)
  }
}

export type CartState = { id: number; version: number }
type LineState = { id: number; quantity: number }
type VariantState = { id: number; product: unknown; variant: unknown }

const json = (raw: unknown): unknown => (typeof raw === "string" ? JSON.parse(raw) : null)

/**
 * One read round before writing: cart (`active`), variant (not deleted) and optionally the line.
 * A given `version` must equal the one read (the cart the caller saw); otherwise the read one is
 * used.
 */
export async function loadForWrite(
  ctx: CartCtx,
  input: { cartPublicId: string; variantPublicId: string; lineKey?: string; version?: number },
): Promise<{ cart: CartState; variant: VariantState; line: LineState | null }> {
  const p = ctx.platform
  const [cartRows = [], variantRows = [], lineRows = []] = await p.batch([
    sqlStatement(sql`SELECT "id", "version", "status" FROM "carts"
      WHERE "public_id" = ${input.cartPublicId}`),
    sqlStatement(sql`SELECT v."id", v."personalization" AS vp, p."personalization" AS pp
      FROM "product_variants" v JOIN "products" p ON p."id" = v."product_id"
      WHERE v."public_id" = ${input.variantPublicId} AND v."deleted_at" IS NULL
        AND p."deleted_at" IS NULL`),
    sqlStatement(sql`SELECT l."id", l."quantity" FROM "cart_lines" l
      JOIN "carts" c ON c."id" = l."cart_id" JOIN "product_variants" v ON v."id" = l."variant_id"
      WHERE c."public_id" = ${input.cartPublicId} AND v."public_id" = ${input.variantPublicId}
        AND l."line_key" = ${input.lineKey ?? ""}`),
  ])
  const c = cartRows[0]
  if (!c) throw new CartError("NOT_FOUND", "sepet yok")
  const cart = { id: Number(c.id), version: Number(c.version) }
  if (c.status !== "active" || (input.version !== undefined && input.version !== cart.version)) {
    throw new CartError("CART_CHANGED", "sepet değişti")
  }
  const v = variantRows[0]
  if (!v) throw new CartError("NOT_FOUND", "varyant yok")
  const l = lineRows[0]
  return {
    cart,
    variant: { id: Number(v.id), product: json(v.pp), variant: json(v.vp) },
    line: l ? { id: Number(l.id), quantity: Number(l.quantity) } : null,
  }
}

/**
 * Validates personalization. Image fields need a second read: does the `media` row exist, is it
 * `ready`, is this cart its owner (`owner_kind = 'cart'`). Another cart's image is rejected as
 * missing.
 */
export async function validateFor(ctx: CartCtx, cart: CartState, v: VariantState, input: unknown) {
  const def = effectiveDefinition(v.product, v.variant)
  const ids =
    def && input && typeof input === "object"
      ? def.fields
          .filter((f) => f.type === "image")
          .map((f) => (input as Record<string, unknown>)[f.key])
          .filter((x): x is string => typeof x === "string" && x.trim() !== "")
          .map((x) => x.trim())
      : []
  const media = new Map<string, MediaInfo>()
  if (ids.length > 0) {
    const list = sql.join(
      ids.map((id) => sql`${id}`),
      sql`, `,
    )
    const [rows = []] = await ctx.platform.batch([
      sqlStatement(sql`SELECT "public_id", "mime", "bytes" FROM "media"
        WHERE "public_id" IN (${list}) AND "owner_kind" = 'cart' AND "owner_id" = ${cart.id}
          AND "status" = 'ready'`),
    ])
    for (const r of rows) {
      media.set(String(r.public_id), {
        mime: r.mime === null ? null : String(r.mime),
        bytes: r.bytes === null ? null : Number(r.bytes),
      })
    }
  }
  return validatePersonalization(def, input, (id) => media.get(id))
}

/** Cart still at the version read and `active`: every line write is bound to this. */
export const cartGuard = (cart: CartState): SQL =>
  sql`EXISTS (SELECT 1 FROM "carts" WHERE "id" = ${cart.id} AND "version" = ${cart.version}
    AND "status" = 'active')`

/** Last statement: `version + 1`; placed last because line statements check the same version. */
export function bumpVersion(cart: CartState, now: number): AtomicStatement {
  return sqlStatement(sql`UPDATE "carts" SET "version" = "version" + 1, "updated_at" = ${now}
    WHERE "id" = ${cart.id} AND "version" = ${cart.version} AND "status" = 'active'`)
}

/** Single `atomic()`; if the last statement (version bump) missed, nothing was written. */
export async function writeLines(
  ctx: CartCtx,
  cart: CartState,
  stmts: AtomicStatement[],
): Promise<{ version: number }> {
  const all = [...stmts, bumpVersion(cart, ctx.now)]
  const result = await ctx.platform.atomic(all)
  if (!affected(result, all.length - 1)) throw new CartError("CART_CHANGED", "sepet değişti")
  return { version: cart.version + 1 }
}

/** `ON CONFLICT(cart_id, variant_id, line_key) DO UPDATE`: the same line adds quantity. */
export function upsertLine(
  cart: CartState,
  row: {
    variantId: number
    quantity: number | SQL
    personalization: unknown
    customFields?: unknown
    lineKey: string
    now: number
  },
  extra: SQL = sql`1 = 1`,
): AtomicStatement {
  const personalization = row.personalization ? JSON.stringify(row.personalization) : null
  const custom = row.customFields ? JSON.stringify(row.customFields) : null
  return sqlStatement(sql`INSERT INTO "cart_lines" ("cart_id", "variant_id", "quantity",
      "custom_fields", "personalization", "line_key", "created_at", "updated_at")
    SELECT ${cart.id}, ${row.variantId}, ${row.quantity}, ${custom}, ${personalization},
      ${row.lineKey}, ${row.now}, ${row.now}
    WHERE ${cartGuard(cart)} AND ${extra}
    ON CONFLICT ("cart_id", "variant_id", "line_key") DO UPDATE SET
      "quantity" = "quantity" + excluded."quantity",
      "custom_fields" = coalesce(excluded."custom_fields", "custom_fields"),
      "updated_at" = excluded."updated_at"`)
}
