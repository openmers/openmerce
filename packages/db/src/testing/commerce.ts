import type Database from "better-sqlite3"

// Ticaret şema testleri (0006-0016) için en küçük satırlar; yalnız testler kullanır.

export const NOW = 1_700_000_000_000

let seq = 0
const next = () => ++seq

export function seeder(db: Database.Database) {
  const run = (sql: string, ...args: unknown[]) =>
    Number(db.prepare(sql).run(...args).lastInsertRowid)
  const indexSql = (name: string) =>
    db
      .prepare("SELECT sql FROM sqlite_master WHERE type = 'index' AND name = ?")
      .pluck()
      .get(name) as string | undefined
  /** EXPLAIN QUERY PLAN satırları; `assertNoFullScan` test-utils'te (db → test-utils döngüsü). */
  const plan = (sql: string, ...args: unknown[]) =>
    (db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...args) as { detail: string }[]).map(
      (r) => r.detail,
    )

  const channel = () => {
    const n = next()
    return run(
      `INSERT INTO channels (public_id, code, default_currency, currencies, langs, created_at, updated_at)
       VALUES (?, ?, 'USD', '["USD"]', '["en"]', ?, ?)`,
      `chn_${n}`,
      `c${n}`,
      NOW,
      NOW,
    )
  }
  const taxCategory = (code = `cat${next()}`) =>
    run(
      "INSERT INTO tax_categories (code, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
      code,
      code,
      NOW,
      NOW,
    )
  const product = () =>
    run(
      "INSERT INTO products (public_id, created_at, updated_at) VALUES (?, ?, ?)",
      `prod_${next()}`,
      NOW,
      NOW,
    )
  const variant = (productId: number, sku = `SKU-${next()}`, taxCategoryId = taxCategory()) =>
    run(
      `INSERT INTO product_variants (public_id, product_id, sku, tax_category_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      `var_${next()}`,
      productId,
      sku,
      taxCategoryId,
      NOW,
      NOW,
    )
  const location = () =>
    run(
      "INSERT INTO stock_locations (public_id, name, created_at, updated_at) VALUES (?, 'Depo', ?, ?)",
      `loc_${next()}`,
      NOW,
      NOW,
    )
  const zone = () =>
    run(
      "INSERT INTO zones (public_id, name, created_at, updated_at) VALUES (?, 'Bölge', ?, ?)",
      `zon_${next()}`,
      NOW,
      NOW,
    )
  const media = (key = `k/${next()}`) =>
    run(
      `INSERT INTO media (public_id, status, bucket, key, created_at, updated_at)
       VALUES (?, 'ready', 'public', ?, ?, ?)`,
      `med_${next()}`,
      key,
      NOW,
      NOW,
    )

  const customer = (email = `c${next()}@example.com`) =>
    run(
      `INSERT INTO customers (public_id, email, email_normalized, source, created_at, updated_at)
       VALUES (?, ?, ?, 'checkout', ?, ?)`,
      `cus_${next()}`,
      email,
      email.trim().toLowerCase(),
      NOW,
      NOW,
    )
  const promotion = (couponCode: string | null = null, usageLimit: number | null = null) =>
    run(
      `INSERT INTO promotions (public_id, name, enabled, priority, coupon_code, usage_limit,
         conditions, actions, stackable, created_at, updated_at)
       VALUES (?, 'Promo', 1, 0, ?, ?, '[]', '[]', 0, ?, ?)`,
      `prm_${next()}`,
      couponCode,
      usageLimit,
      NOW,
      NOW,
    )
  const cart = (channelId = channel(), customerId: number | null = null) =>
    run(
      `INSERT INTO carts (public_id, channel_id, customer_id, currency, expires_at, created_at, updated_at)
       VALUES (?, ?, ?, 'USD', ?, ?, ?)`,
      `cart_${next()}`,
      channelId,
      customerId,
      NOW,
      NOW,
      NOW,
    )
  const paymentMethod = (code = `pm${next()}`) =>
    run(
      `INSERT INTO payment_methods (code, name, position, handler_code, created_at, updated_at)
       VALUES (?, ?, 0, 'manual', ?, ?)`,
      code,
      code,
      NOW,
      NOW,
    )
  const reservation = (status = "active", channelId = channel()) =>
    run(
      `INSERT INTO checkout_reservations (public_id, cart_id, channel_id, snapshot, payment_method_id,
         status, expires_at, created_at, updated_at) VALUES (?, 0, ?, '{}', ?, ?, ?, ?, ?)`,
      `rsv_${next()}`,
      channelId,
      paymentMethod(),
      status,
      NOW,
      NOW,
      NOW,
    )
  const order = (channelId = channel(), number = `2026-${next()}`, reservationId?: number) =>
    run(
      `INSERT INTO orders (public_id, number, channel_id, customer_id, reservation_id, currency,
         subtotal_net, tax_total, total_gross, discount_total, shipping_total, payment_status, lang,
         placed_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'USD', 1000, 200, 1200, 0, 0, 'awaiting', 'en', ?, ?)`,
      `ord_${next()}`,
      number,
      channelId,
      customer(),
      reservationId ?? reservation("settled", channelId),
      NOW,
      NOW,
    )
  const orderLine = (orderId: number, quantity = 2) =>
    run(
      `INSERT INTO order_lines (public_id, order_id, variant_id, name, sku, unit_price_net,
         unit_price_gross, base_unit_price, quantity, stock_units)
       VALUES (?, ?, ?, 'Ürün', 'SKU', 500, 600, 500, ?, ?)`,
      `itm_${next()}`,
      orderId,
      variant(product()),
      quantity,
      quantity,
    )

  return {
    run,
    indexSql,
    plan,
    channel,
    taxCategory,
    product,
    variant,
    location,
    zone,
    media,
    customer,
    promotion,
    cart,
    paymentMethod,
    reservation,
    order,
    orderLine,
  }
}
