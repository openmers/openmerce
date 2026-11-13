import {
  adjustStock,
  type CalcConfig,
  type CreateReservationInput,
  calculate,
  compilePromotions,
  createPriceList,
  createReservation,
  loadCartData,
  loadPromotions,
  type Platform,
  setPrices,
} from "@openmers/core"
import type Database from "better-sqlite3"
import { NOW } from "../catalog/helpers"
import { seedStock } from "../stock/helpers"

/**
 * Channel + two variants (a, b) + location + USD base list (a 1000, b 2500, tax exclusive) +
 * payment method. `stock` quantities go to the first location.
 */
export async function seedCheckout(conn: Database.Database, stock: { a: number; b: number }) {
  const s = await seedStock(conn)
  for (const [variant, delta] of [
    [s.variants.a, stock.a],
    [s.variants.b, stock.b],
  ] as const) {
    if (delta > 0) {
      await adjustStock(s.ctx, { variantPublicId: variant, locationPublicId: s.location, delta })
    }
  }
  const list = await createPriceList(s.ctx, {
    name: "Base",
    currency: "USD",
    type: "base",
    includesTax: false,
  })
  await setPrices(s.ctx, {
    priceListPublicId: list.publicId,
    items: [
      { variantPublicId: s.variants.a, amount: 1000 },
      { variantPublicId: s.variants.b, amount: 2500 },
    ],
  })
  const run = (sql: string, ...args: unknown[]) =>
    Number(conn.prepare(sql).run(...args).lastInsertRowid)
  // shipping is out of scope: digital lines need no shipping, stock is still tracked
  run("UPDATE product_variants SET fulfillment_type = 'digital'")
  const paymentMethodId = run(
    `INSERT INTO payment_methods (code, name, position, handler_code, created_at, updated_at)
     VALUES ('manual', 'Havale', 0, 'manual', ?, ?)`,
    NOW,
    NOW,
  )
  let n = 0
  const cart = (coupons: string[] = []) => {
    const publicId = `cart_TEST${String(++n).padStart(6, "0")}`
    run(
      `INSERT INTO carts (public_id, channel_id, currency, coupon_codes, expires_at, created_at,
         updated_at) VALUES (?, ?, 'USD', ?, ?, ?, ?)`,
      publicId,
      s.ctx.channel.id,
      JSON.stringify(coupons),
      NOW + 86_400_000,
      NOW,
      NOW,
    )
    return publicId
  }
  /** Limited coupon linked to the channel, with a line percent discount. */
  const coupon = (code: string, usageLimit: number) => {
    const id = run(
      `INSERT INTO promotions (public_id, name, enabled, priority, coupon_code, usage_limit,
         conditions, actions, stackable, created_at, updated_at)
       VALUES (?, 'Kupon', 1, 0, ?, ?, '[]', '[{"code":"linePercent","args":{"bp":1000}}]', 1, ?, ?)`,
      `prm_TEST${code.padStart(6, "0").slice(-6)}`,
      code,
      usageLimit,
      NOW,
      NOW,
    )
    run(
      "INSERT INTO promotion_channels (promotion_id, channel_id, created_at) VALUES (?, ?, ?)",
      id,
      s.ctx.channel.id,
      NOW,
    )
    return id
  }
  return { ...s, paymentMethodId, cart, coupon }
}

type ChannelCfg = { id: number; defaultTaxZoneId: number | null; pricesIncludeTax: boolean }

/** One request's checkout read: promotions, cart data (two rounds), totals; no writes. */
export async function prepareCheckout(
  p: Platform,
  channel: ChannelCfg,
  cartPublicId: string,
  paymentMethodId: number,
): Promise<CreateReservationInput> {
  const { rows, links } = await loadPromotions(p)
  const promotions = compilePromotions(rows, links).byChannel.get(channel.id) ?? []
  const data = await loadCartData(p, { cartPublicId, promotions })
  if (!data) throw new Error("sepet yok")
  const config: CalcConfig = {
    channel,
    promotions,
    shippingMethods: [],
    tax: { zones: [], categories: [], rates: [] },
    now: NOW,
  }
  return { data, totals: calculate(data, config), paymentMethodId, expiresAt: NOW + 3_600_000 }
}

/** Read + reservation write (one request's checkout step). */
export async function reserveCart(
  p: Platform,
  channel: ChannelCfg,
  cartPublicId: string,
  paymentMethodId: number,
) {
  const input = await prepareCheckout(p, channel, cartPublicId, paymentMethodId)
  return createReservation({ platform: p, now: NOW }, input)
}
