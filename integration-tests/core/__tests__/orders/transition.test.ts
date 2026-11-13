import { applyTransition } from "@openmers/core"
import { describeOnTargets } from "@openmers/test-utils"
import { expect, it } from "vitest"
import { NOW } from "../catalog/helpers"
import { seedSettle } from "../checkout/settleHelpers"

describeOnTargets("order transitions", (getDb) => {
  it("moves the state with one event and outbox row; a wrong expected state writes nothing", async () => {
    const s = await seedSettle(getDb(), { a: 5, b: 0 })
    const r = await s.reserve()
    const { orderPublicId } = await s.settle(s.paid(r.publicId, r.gross))
    const ctx = { platform: s.p, now: NOW }
    const move = { orderPublicId, from: "placed", to: "completed" } as const

    expect(await applyTransition(ctx, move)).toBe(true)
    expect(await applyTransition(ctx, move)).toBe(false)
    expect(s.rows("order_events WHERE kind = 'state'")).toBe(1)
    expect(s.rows("outbox WHERE event = 'order.completed'")).toBe(1)
    expect(getDb().prepare("SELECT state FROM orders").pluck().get()).toBe("completed")
    await expect(
      applyTransition(ctx, { orderPublicId, from: "completed", to: "placed" }),
    ).rejects.toMatchObject({ code: "INVALID_TRANSITION" })
  })
})
