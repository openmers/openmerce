import {
  adjustStock,
  getStockLevels,
  getStockLevelsQuery,
  listLocations,
  setStock,
} from "@openmers/core"
import { assertNoFullScan, describeOnTargets } from "@openmers/test-utils"
import { expect, it } from "vitest"
import { count, level, seedStock } from "./helpers"

describeOnTargets("stock levels", (getDb) => {
  it("an adjustment writes the level and the movement in the same atomic(); opens the row if missing", async () => {
    const s = await seedStock(getDb())
    const input = { variantPublicId: s.variants.a, locationPublicId: s.location }
    await adjustStock(s.ctx, { ...input, delta: 10 })
    await adjustStock(s.ctx, { ...input, delta: -3 })
    expect(level(getDb(), s.ids.a)).toMatchObject({ on_hand: 7, reserved: 0, version: 2 })
    const moves = getDb()
      .prepare("SELECT kind, quantity, units, ref_type FROM stock_movements ORDER BY id")
      .all()
    expect(moves).toEqual([
      { kind: "adjustment", quantity: 10, units: 10, ref_type: "manual" },
      { kind: "adjustment", quantity: -3, units: -3, ref_type: "manual" },
    ])
    expect(
      count(getDb(), "audit_log WHERE action = 'stock:write' AND entity_type = 'stock_level'"),
    ).toBe(2)
  })

  it("a negative result is rejected: no level, movement or audit is written", async () => {
    const s = await seedStock(getDb())
    const input = { variantPublicId: s.variants.a, locationPublicId: s.location }
    await adjustStock(s.ctx, { ...input, delta: 2 })
    await expect(adjustStock(s.ctx, { ...input, delta: -3 })).rejects.toMatchObject({
      code: "INVALID_INPUT",
    })
    expect(level(getDb(), s.ids.a)).toMatchObject({ on_hand: 2, version: 1 })
    expect(count(getDb(), "stock_movements")).toBe(1)
    expect(count(getDb(), "audit_log WHERE entity_type = 'stock_level'")).toBe(1)
    await expect(adjustStock(s.ctx, { ...input, delta: 0 })).rejects.toMatchObject({
      code: "INVALID_INPUT",
    })
  })

  it("unknown variant/warehouse NOT_FOUND; cannot write to a bundle variant", async () => {
    const s = await seedStock(getDb())
    await expect(
      adjustStock(s.ctx, { variantPublicId: "var_yok", locationPublicId: s.location, delta: 1 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(
      adjustStock(s.ctx, { variantPublicId: s.variants.a, locationPublicId: "loc_yok", delta: 1 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
    getDb()
      .prepare("UPDATE product_variants SET base_variant_id = ?, unit_factor = 12 WHERE id = ?")
      .run(s.ids.a, s.ids.b)
    await expect(
      adjustStock(s.ctx, { variantPublicId: s.variants.b, locationPublicId: s.location, delta: 1 }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" })
    expect(count(getDb(), "stock_levels")).toBe(0)
    expect(count(getDb(), "stock_movements")).toBe(0)
  })

  it("setStock writes an absolute value, units = new − old; CONFLICT on version mismatch", async () => {
    const s = await seedStock(getDb())
    const input = { variantPublicId: s.variants.a, locationPublicId: s.location }
    expect(await setStock(s.ctx, { ...input, onHand: 20, safety: 2 })).toEqual({ version: null })
    expect(await setStock(s.ctx, { ...input, onHand: 15, version: 1 })).toEqual({ version: 2 })
    await expect(setStock(s.ctx, { ...input, onHand: 1, version: 1 })).rejects.toMatchObject({
      code: "CONFLICT",
    })
    expect(level(getDb(), s.ids.a)).toMatchObject({ on_hand: 15, safety: 2, version: 2 })
    const units = getDb().prepare("SELECT units FROM stock_movements ORDER BY id").pluck().all()
    expect(units).toEqual([20, -5])
  })

  it("reindex is produced only when the bucket changes", async () => {
    const s = await seedStock(getDb())
    getDb().prepare("DELETE FROM outbox").run()
    const input = { variantPublicId: s.variants.a, locationPublicId: s.location }
    const reindex = () => count(getDb(), "outbox WHERE kind = 'reindex'")
    await adjustStock(s.ctx, { ...input, delta: 100 }) // out → in_stock
    expect(reindex()).toBe(1)
    const job = getDb().prepare("SELECT payload, dedupe_key FROM outbox").get() as {
      payload: string
      dedupe_key: string
    }
    expect(JSON.parse(job.payload)).toEqual({ product: s.product })
    expect(job.dedupe_key).toBe(`product:${s.product}`)
    getDb().prepare("DELETE FROM outbox").run()
    await adjustStock(s.ctx, { ...input, delta: -50 }) // in_stock → in_stock
    await setStock(s.ctx, { ...input, onHand: 60 })
    expect(reindex()).toBe(0)
    await adjustStock(s.ctx, { ...input, delta: -57 }) // 3: low
    expect(reindex()).toBe(1)
  })

  it("stock read walks the PK; the warehouse list carries channel priority", async () => {
    const s = await seedStock(getDb())
    await adjustStock(s.ctx, {
      variantPublicId: s.variants.a,
      locationPublicId: s.location,
      delta: 4,
    })
    expect(await getStockLevels(s.ctx, s.variants.a)).toEqual([
      { location: s.location, onHand: 4, reserved: 0, safety: 0, available: 4, version: 1 },
    ])
    assertNoFullScan(getDb(), getStockLevelsQuery(s.p.db, s.variants.a).toSQL())
    expect(await listLocations(s.ctx)).toMatchObject([
      { publicId: s.location, name: "Ana depo", channelPriority: 0 },
    ])
  })
})
