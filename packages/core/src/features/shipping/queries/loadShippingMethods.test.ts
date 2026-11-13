import { describeOnTargets } from "@openmers/test-utils"
import { expect, it } from "vitest"
import { sqlitePlatform } from "../../__testing__/sqlitePlatform"
import { loadShippingMethods } from "./loadShippingMethods"

const NOW = 1_700_000_000_000

describeOnTargets("loadShippingMethods", (getDb) => {
  it("yöntemler kanal bağlantılarıyla tek turda; JSON argümanlar çözülür", async () => {
    const db = getDb()
    const p = sqlitePlatform(db)
    expect(await loadShippingMethods(p)).toEqual([])

    const run = (sql: string, ...args: unknown[]) =>
      Number(db.prepare(sql).run(...args).lastInsertRowid)
    const channel = (code: string) =>
      run(
        `INSERT INTO channels (public_id, code, default_currency, currencies, langs, created_at, updated_at)
         VALUES (?, ?, 'USD', '["USD"]', '["en"]', ?, ?)`,
        `chn_${code}`,
        code,
        NOW,
        NOW,
      )
    const a = channel("a")
    const b = channel("b")
    const cat = run(
      "INSERT INTO tax_categories (code, name, created_at, updated_at) VALUES ('shipping', 'Kargo', ?, ?)",
      NOW,
      NOW,
    )
    const insertMethod = (publicId: string, args: object) =>
      run(
        `INSERT INTO shipping_methods (public_id, name, calculator_code, calculator_args,
           tax_category_id, created_at, updated_at) VALUES (?, 'Std', 'flat', ?, ?, ?, ?)`,
        publicId,
        JSON.stringify(args),
        cat,
        NOW,
        NOW,
      )
    const m1 = insertMethod("shm_1", { amount: 500 })
    const m2 = insertMethod("shm_2", { amount: 0 })
    const link = (m: number, c: number) =>
      run(
        "INSERT INTO shipping_method_channels (shipping_method_id, channel_id, created_at) VALUES (?, ?, ?)",
        m,
        c,
        NOW,
      )
    link(m1, b)
    link(m1, a)

    const methods = await loadShippingMethods(p)
    expect(p.batchCalls()).toBe(2)
    expect(methods).toEqual([
      {
        id: m1,
        publicId: "shm_1",
        name: "Std",
        zoneId: null,
        checkerCode: null,
        checkerArgs: null,
        calculatorCode: "flat",
        calculatorArgs: { amount: 500 },
        taxCategoryId: cat,
        pickupLocationId: null,
        channelIds: [a, b],
      },
      expect.objectContaining({ id: m2, channelIds: [] }),
    ])
  })
})
