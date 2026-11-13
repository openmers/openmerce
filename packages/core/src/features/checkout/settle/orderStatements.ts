import { orderAdjustments, orderLines, orderShippingLines, orderTaxLines } from "@openmers/db"
import { type SQL, sql } from "drizzle-orm"
import { type AtomicStatement, guardedInsertStatement } from "../../../platform"
import { newPublicId } from "../../ids"
import type { SettleSnapshot } from "./snapshot"

const variant = (id: number, col: string) =>
  sql`(SELECT ${sql.identifier(col)} FROM "product_variants" WHERE "id" = ${id})`

/**
 * Order lines, discount, tax and shipping lines from the reservation snapshot (05-sepet §5), each
 * bound to `won` (this call holds the settlement token). Name and SKU are copied from the catalog
 * here because the snapshot does not carry them.
 */
export function orderChildStatements(
  snap: SettleSnapshot,
  orderId: SQL,
  won: SQL,
  lang: string | SQL,
): AtomicStatement[] {
  const out: AtomicStatement[] = []
  const lineIds = new Map<string, SQL>()
  for (const l of snap.lines) {
    const publicId = newPublicId("itm_")
    const lineId = sql`(SELECT "id" FROM "order_lines" WHERE "public_id" = ${publicId})`
    lineIds.set(l.key, lineId)
    const name = sql`coalesce((SELECT t."name" FROM "product_translations" t
      WHERE t."product_id" = ${variant(l.variantId, "product_id")} AND t."channel_id" IS NULL
      ORDER BY t."lang" = ${lang} DESC, t."id" LIMIT 1), ${variant(l.variantId, "sku")})`
    const at = snap.allocation.find((a) => a.variantId === l.variantId)
    out.push(
      guardedInsertStatement(
        orderLines,
        {
          publicId,
          orderId,
          variantId: l.variantId,
          name,
          sku: variant(l.variantId, "sku"),
          unitPriceNet: Math.round(l.net / l.quantity),
          unitPriceGross: Math.round(l.gross / l.quantity),
          baseUnitPrice: l.baseUnitPrice,
          surcharge: l.surcharge,
          quantity: l.quantity,
          stockUnits: sql`${l.quantity} * ${variant(l.variantId, "unit_factor")}`,
          locationId: at?.locationId ?? null,
          personalization: l.personalization ?? undefined,
          fulfillmentType: variant(l.variantId, "fulfillment_type"),
        },
        won,
      ),
    )
    if (l.taxRateIds.length > 0) {
      const ids = sql.join(
        l.taxRateIds.map((id) => sql`${id}`),
        sql`, `,
      )
      out.push(
        guardedInsertStatement(
          orderTaxLines,
          {
            orderId,
            orderLineId: lineId,
            rateBp: sql`coalesce((SELECT sum("rate_bp") FROM "tax_rates" WHERE "id" IN (${ids})), 0)`,
            amount: l.tax,
            taxCategory: sql`(SELECT "code" FROM "tax_categories" WHERE "id" = ${l.taxCategoryId})`,
          },
          won,
        ),
      )
    }
  }
  for (const a of snap.adjustments) {
    if (a.amount <= 0) continue
    const promo = (col: string) =>
      sql`(SELECT ${sql.identifier(col)} FROM "promotions" WHERE "id" = ${a.promotionId})`
    out.push(
      guardedInsertStatement(
        orderAdjustments,
        {
          orderId,
          orderLineId: a.target === "line" ? (lineIds.get(a.lineKey) ?? null) : null,
          source: sql`CASE WHEN ${promo("coupon_code")} IS NULL THEN 'promotion' ELSE 'coupon' END`,
          promotionId: a.promotionId,
          amount: a.amount,
          target: a.target,
          description: promo("name"),
        },
        won,
      ),
    )
  }
  const ship = snap.shipping
  if (ship.needsShipping && ship.methodId !== null) {
    out.push(
      guardedInsertStatement(
        orderShippingLines,
        {
          orderId,
          shippingMethodId: ship.methodId,
          methodName: sql`coalesce((SELECT "name" FROM "shipping_methods"
            WHERE "id" = ${ship.methodId}), '')`,
          amount: ship.amount,
        },
        won,
      ),
    )
  }
  if (ship.tax > 0) {
    // the snapshot keeps no shipping rate ids; the effective rate is recovered from the amounts
    const rateBp = ship.net > 0 ? Math.round((ship.tax * 10_000) / ship.net) : 0
    out.push(
      guardedInsertStatement(
        orderTaxLines,
        { orderId, orderLineId: null, rateBp, amount: ship.tax },
        won,
      ),
    )
  }
  return out
}
