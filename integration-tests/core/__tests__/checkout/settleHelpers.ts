import { addLine, type Platform, type SettleInput, settle } from "@openmers/core"
import type Database from "better-sqlite3"
import { NOW } from "../catalog/helpers"
import { count } from "../stock/helpers"
import { reserveCart, seedCheckout } from "./helpers"

/** `seedCheckout` + a customer; `reserve` builds a cart for that customer and reserves it. */
export async function seedSettle(conn: Database.Database, stock: { a: number; b: number }) {
  const s = await seedCheckout(conn, stock)
  const customerId = Number(
    conn
      .prepare(
        `INSERT INTO customers (public_id, email, email_normalized, source, created_at, updated_at)
         VALUES ('cus_TEST000001', 'a@example.test', 'a@example.test', 'checkout', ?, ?)`,
      )
      .run(NOW, NOW).lastInsertRowid,
  )
  const reserve = async (o: { qty?: number; coupons?: string[]; p?: Platform } = {}) => {
    const cart = s.cart(o.coupons ?? [])
    conn.prepare("UPDATE carts SET customer_id = ? WHERE public_id = ?").run(customerId, cart)
    await addLine(
      { platform: s.p, now: NOW },
      { cartPublicId: cart, variantPublicId: s.variants.a, quantity: o.qty ?? 1 },
    )
    const { publicId } = await reserveCart(o.p ?? s.p, s.ctx.channel, cart, s.paymentMethodId)
    const snap = JSON.parse(
      conn
        .prepare("SELECT snapshot FROM checkout_reservations WHERE public_id = ?")
        .pluck()
        .get(publicId) as string,
    )
    return { cart, publicId, gross: Number(snap.totals.gross) }
  }
  const paid = (publicId: string, gross: number, reference = `pi_${publicId}`): SettleInput => ({
    reservationPublicId: publicId,
    payment: { amount: gross, currency: "USD", reference, state: "settled" },
  })
  const doSettle = (input: SettleInput, p: Platform = s.p) =>
    settle({ platform: p, now: NOW }, input)
  const rows = (table: string) => count(conn, table)
  return { ...s, customerId, reserve, paid, settle: doSettle, rows }
}
