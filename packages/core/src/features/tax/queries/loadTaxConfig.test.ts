import { describeOnTargets } from "@openmers/test-utils"
import { expect, it } from "vitest"
import { sqlitePlatform } from "../../__testing__/sqlitePlatform"
import { loadTaxConfig } from "./loadTaxConfig"

const NOW = 1_700_000_000_000

describeOnTargets("loadTaxConfig", (getDb) => {
  it("boş DB'de boş; bölge üyeleri ve oranlar tek turda", async () => {
    const db = getDb()
    const p = sqlitePlatform(db)
    expect(await loadTaxConfig(p)).toEqual({ zones: [], categories: [], rates: [] })

    const run = (sql: string, ...args: unknown[]) =>
      Number(db.prepare(sql).run(...args).lastInsertRowid)
    const zone = run(
      "INSERT INTO zones (public_id, name, created_at, updated_at) VALUES ('zon_1', 'EU', ?, ?)",
      NOW,
      NOW,
    )
    run("INSERT INTO zone_members (zone_id, country, region) VALUES (?, 'DE', NULL)", zone)
    run("INSERT INTO zone_members (zone_id, country, region) VALUES (?, 'AT', 'AT-9')", zone)
    const cat = run(
      "INSERT INTO tax_categories (code, name, created_at, updated_at) VALUES ('standard', 'Std', ?, ?)",
      NOW,
      NOW,
    )
    run(
      `INSERT INTO tax_rates (public_id, zone_id, tax_category_id, customer_group_id, rate_bp,
         created_at, updated_at) VALUES ('txr_1', ?, ?, NULL, 1900, ?, ?)`,
      zone,
      cat,
      NOW,
      NOW,
    )

    const config = await loadTaxConfig(p)
    expect(p.batchCalls()).toBe(2) // her çağrı tek tur
    expect(config.zones).toEqual([
      {
        id: zone,
        publicId: "zon_1",
        name: "EU",
        members: [
          { country: "AT", region: "AT-9" },
          { country: "DE", region: null },
        ],
      },
    ])
    expect(config.categories).toEqual([{ id: cat, code: "standard", name: "Std" }])
    expect(config.rates).toEqual([
      {
        id: 1,
        publicId: "txr_1",
        zoneId: zone,
        taxCategoryId: cat,
        customerGroupId: null,
        rateBp: 1900,
      },
    ])
  })
})
