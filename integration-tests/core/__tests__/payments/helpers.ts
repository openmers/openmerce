import { createPaymentRegistry, loadPaymentMethods, type PaymentMethod } from "@openmers/core"
import { fakePaymentHandler } from "@openmers/test-utils"
import type Database from "better-sqlite3"
import { NOW } from "../catalog/helpers"
import { seedSettle } from "../checkout/settleHelpers"

export const SECRET = "whsec_test"

/** Settlement seed + an enabled `fake` method linked to the channel, loaded through the registry. */
export async function seedPayments(conn: Database.Database, stock = { a: 10, b: 0 }) {
  const s = await seedSettle(conn, stock)
  const fake = fakePaymentHandler()
  const id = Number(
    conn
      .prepare(
        `INSERT INTO payment_methods (code, name, position, handler_code, handler_args, created_at,
           updated_at) VALUES ('card', 'Card', 1, 'fake', ?, ?, ?)`,
      )
      .run(JSON.stringify({ secret: SECRET }), NOW, NOW).lastInsertRowid,
  )
  conn
    .prepare(
      "INSERT INTO payment_method_channels (payment_method_id, channel_id, created_at) VALUES (?, ?, ?)",
    )
    .run(id, s.ctx.channel.id, NOW)
  const registry = createPaymentRegistry(await loadPaymentMethods(s.p), { fake: fake.handler })
  const method = registry.byCode("card") as PaymentMethod
  const rctx = { platform: s.p, now: NOW }
  let n = 0
  const paidEvent = (reservationPublicId: string, amount: number, extra = {}) => ({
    kind: "paid",
    eventId: `evt_${++n}`,
    reservationPublicId,
    reference: `pi_${reservationPublicId}`,
    amount,
    currency: "USD",
    captured: true,
    ...extra,
  })
  const refundEvent = (reservationPublicId: string, refundedAmount: number, eventId: string) => ({
    kind: "refundSync",
    eventId,
    reference: `pi_${reservationPublicId}`,
    refundedAmount,
    currency: "USD",
  })
  return { ...s, fake, registry, method, rctx, paidEvent, refundEvent }
}
