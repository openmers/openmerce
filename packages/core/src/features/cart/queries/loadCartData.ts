import { sql } from "drizzle-orm"
import { type BatchRows, type Platform, sqlStatement } from "../../../platform"
import { type CompiledPromotion, collectRequirements } from "../../promotions"
import type { PersonalizationValue } from "../personalization/schema"
import type { CartData, CartLineData, CartRow } from "./cartData"

type P = Pick<Platform, "db" | "batch">

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v))
const json = <T>(v: unknown): T | null => (typeof v === "string" ? (JSON.parse(v) as T) : null)

function mapCart(r: Record<string, unknown>): CartRow {
  return {
    id: Number(r.id),
    publicId: String(r.public_id),
    channelId: Number(r.channel_id),
    customerId: num(r.customer_id),
    companyId: num(r.company_id),
    status: String(r.status),
    currency: String(r.currency),
    shippingAddress: json(r.shipping_address),
    billingAddress: json(r.billing_address),
    shippingMethodId: num(r.shipping_method_id),
    couponCodes: json<string[]>(r.coupon_codes) ?? [],
    email: r.email === null ? null : String(r.email),
    version: Number(r.version),
  }
}

function mapLine(r: Record<string, unknown>): CartLineData {
  return {
    id: Number(r.id),
    variantId: Number(r.variant_id),
    variantPublicId: String(r.variant_public_id),
    productId: Number(r.product_id),
    quantity: Number(r.quantity),
    lineKey: String(r.line_key),
    personalization: json<PersonalizationValue>(r.personalization),
    customFields: json(r.custom_fields),
    productPersonalization: json(r.pp),
    variantPersonalization: json(r.vp),
    taxCategoryId: Number(r.tax_category_id),
    physical: r.fulfillment_type === "physical",
    trackInventory: Number(r.track_inventory) === 1,
    weight: num(r.weight),
    length: num(r.length),
    width: num(r.width),
    height: num(r.height),
  }
}

/**
 * Cart data in at most two rounds (05-sepet §2): 1) cart + lines (with variant/product fields),
 * 2) price candidates, sellable stock in the channel's locations and promotion `requires` queries
 * in one `batch`. Tax and shipping tables live in memory (registries). `null` if no cart.
 *
 * `getPricesQuery` is not reused: raw `batch` rows are keyed by column name and its two
 * `public_id` columns would collide.
 */
export async function loadCartData(
  p: P,
  input: { cartPublicId: string; promotions?: readonly CompiledPromotion[] },
): Promise<CartData | null> {
  const [cartRows = [], lineRows = []] = await p.batch([
    sqlStatement(sql`SELECT * FROM "carts" WHERE "public_id" = ${input.cartPublicId}`),
    sqlStatement(sql`SELECT l.*, v."public_id" AS variant_public_id, v."product_id",
        v."tax_category_id", v."fulfillment_type", v."track_inventory", v."weight", v."length",
        v."width", v."height", v."personalization" AS vp, p."personalization" AS pp
      FROM "cart_lines" l JOIN "product_variants" v ON v."id" = l."variant_id"
      JOIN "products" p ON p."id" = v."product_id"
      WHERE l."cart_id" = (SELECT "id" FROM "carts" WHERE "public_id" = ${input.cartPublicId})
      ORDER BY l."id"`),
  ])
  const first = cartRows[0]
  if (!first) return null
  const cart = mapCart(first)
  const lines = lineRows.map(mapLine)
  const requirements = collectRequirements(p, input.promotions ?? [], {
    customerId: cart.customerId,
  })
  if (lines.length === 0 && requirements.queries.length === 0) {
    return { cart, lines, prices: [], stock: [], promoData: {} }
  }

  const ids = sql.join(
    (lines.length > 0 ? lines : [{ variantId: 0 }]).map((l) => sql`${l.variantId}`),
    sql`, `,
  )
  const [priceRows = [], stockRows = [], ...reqRows] = await p.batch([
    sqlStatement(sql`SELECT pr."variant_id", l."public_id" AS price_list, l."type", l."priority",
        l."starts_at", l."ends_at", l."status", l."includes_tax", pr."min_qty", pr."amount",
        pr."compare_at_amount", pr."currency"
      FROM "prices" pr JOIN "price_lists" l ON l."id" = pr."price_list_id"
      WHERE l."channel_id" = ${cart.channelId} AND pr."currency" = ${cart.currency}
        AND pr."variant_id" IN (${ids})`),
    sqlStatement(sql`SELECT s."variant_id", s."location_id",
        s."on_hand" - s."reserved" - s."safety" AS sellable, c."priority"
      FROM "stock_levels" s JOIN "channel_stock_locations" c
        ON c."location_id" = s."location_id" AND c."channel_id" = ${cart.channelId}
      WHERE s."variant_id" IN (${ids}) ORDER BY c."priority", s."location_id"`),
    ...requirements.queries,
  ])
  return {
    cart,
    lines,
    prices: priceRows.map((r) => ({
      variantId: Number(r.variant_id),
      priceList: String(r.price_list),
      type: r.type as CartData["prices"][number]["type"],
      priority: Number(r.priority),
      startsAt: num(r.starts_at),
      endsAt: num(r.ends_at),
      status: r.status as "active" | "expired",
      includesTax: Number(r.includes_tax) === 1,
      minQty: Number(r.min_qty),
      amount: Number(r.amount),
      compareAtAmount: num(r.compare_at_amount),
      currency: String(r.currency),
    })),
    stock: stockRows.map((r) => ({
      variantId: Number(r.variant_id),
      locationId: Number(r.location_id),
      sellable: Number(r.sellable),
      priority: Number(r.priority),
    })),
    promoData: requirements.read(reqRows as BatchRows[]),
  }
}
