import { sql } from "drizzle-orm"
import { type Platform, sqlStatement } from "../../../platform"

export type ReservationView = {
  publicId: string
  status: string
  paymentMethodId: number
  expiresAt: number
  cartPublicId: string | null
  customerId: number | null
  gross: number
  currency: string
  order: { publicId: string; number: string } | null
}

/** Reservation + its order (if settled) in one read; the return page and ownership checks use it. */
export async function getReservation(
  p: Pick<Platform, "batch">,
  publicId: string,
): Promise<ReservationView | null> {
  const [rows = []] = await p.batch([
    sqlStatement(sql`SELECT r."public_id", r."status", r."payment_method_id", r."expires_at",
        json_extract(r."snapshot", '$.cart.publicId') AS "cart_public_id",
        json_extract(r."snapshot", '$.customerId') AS "customer_id",
        json_extract(r."snapshot", '$.totals.gross') AS "gross",
        json_extract(r."snapshot", '$.currency') AS "currency",
        o."public_id" AS "order_public_id", o."number"
      FROM "checkout_reservations" r LEFT JOIN "orders" o ON o."reservation_id" = r."id"
      WHERE r."public_id" = ${publicId}`),
  ])
  const r = rows[0]
  if (!r) return null
  return {
    publicId: String(r.public_id),
    status: String(r.status),
    paymentMethodId: Number(r.payment_method_id),
    expiresAt: Number(r.expires_at),
    cartPublicId: r.cart_public_id == null ? null : String(r.cart_public_id),
    customerId: r.customer_id == null ? null : Number(r.customer_id),
    gross: Number(r.gross),
    currency: String(r.currency),
    order: r.order_public_id
      ? { publicId: String(r.order_public_id), number: String(r.number) }
      : null,
  }
}
