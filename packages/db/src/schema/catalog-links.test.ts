import type Database from "better-sqlite3"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { NOW, seeder } from "../testing/commerce"
import { openMigratedDb } from "../testing/sqlite"

// 0006_catalog links: variant–option value, product/variant–facet value. Real SQLite.
let db: Database.Database
let s: ReturnType<typeof seeder>
beforeEach(() => {
  db = openMigratedDb()
  s = seeder(db)
})
afterEach(() => db.close())

const option = (productId: number, code: string) =>
  s.run(
    "INSERT INTO product_options (product_id, code, position, created_at, updated_at) VALUES (?, ?, 0, ?, ?)",
    productId,
    code,
    NOW,
    NOW,
  )
const value = (optionId: number, code: string) =>
  s.run(
    "INSERT INTO option_values (option_id, code, position, created_at, updated_at) VALUES (?, ?, 0, ?, ?)",
    optionId,
    code,
    NOW,
    NOW,
  )
const facetValue = () => {
  const f = s.run(
    "INSERT INTO facets (code, created_at, updated_at) VALUES (?, ?, ?)",
    `f${Math.random()}`,
    NOW,
    NOW,
  )
  return s.run(
    "INSERT INTO facet_values (facet_id, code, created_at, updated_at) VALUES (?, 'v', ?, ?)",
    f,
    NOW,
    NOW,
  )
}

describe("sqlite_master", () => {
  it("reverse lookup indexes and option uniqueness exist", () => {
    expect(s.indexSql("variant_option_values_value_idx")).toMatch(
      /INDEX .*\(`option_value_id`,`variant_id`\)/,
    )
    expect(s.indexSql("variant_option_values_option_uq")).toMatch(/UNIQUE INDEX/)
    expect(s.indexSql("product_facet_values_value_idx")).toMatch(
      /INDEX .*\(`facet_value_id`,`product_id`\)/,
    )
    expect(s.indexSql("variant_facet_values_value_idx")).toMatch(
      /INDEX .*\(`facet_value_id`,`variant_id`\)/,
    )
  })
})

describe("variant_option_values", () => {
  it("duplicate row, second value for the same option and wrong option rejected", () => {
    const p = s.product()
    const v = s.variant(p)
    const size = option(p, "size")
    const color = option(p, "color")
    const [s1, s2, red] = [value(size, "s"), value(size, "m"), value(color, "red")]
    const link = (optionId: number, optionValueId: number) =>
      s.run(
        "INSERT INTO variant_option_values (variant_id, option_id, option_value_id, created_at) VALUES (?, ?, ?, ?)",
        v,
        optionId,
        optionValueId,
        NOW,
      )
    link(size, s1)
    expect(() => link(size, s1)).toThrow(/UNIQUE constraint failed/)
    expect(() => link(size, s2)).toThrow(
      /variant_option_values.variant_id, variant_option_values.option_id/,
    )
    // value belongs to another option: composite FK
    expect(() => link(color, s2)).toThrow(/FOREIGN KEY constraint failed/)
    link(color, red)
  })
})

describe("product/variant–facet value", () => {
  it("duplicate row and FK violation rejected", () => {
    const p = s.product()
    const v = s.variant(p)
    const fv = facetValue()
    const insert = (table: string, col: string, id: number, facetValueId: number) =>
      s.run(
        `INSERT INTO ${table} (${col}, facet_value_id, created_at) VALUES (?, ?, ?)`,
        id,
        facetValueId,
        NOW,
      )
    for (const [table, col, id] of [
      ["product_facet_values", "product_id", p],
      ["variant_facet_values", "variant_id", v],
    ] as const) {
      insert(table, col, id, fv)
      expect(() => insert(table, col, id, fv)).toThrow(/UNIQUE constraint failed/)
      expect(() => insert(table, col, id, 999)).toThrow(/FOREIGN KEY constraint failed/)
      expect(() => insert(table, col, 999, fv)).toThrow(/FOREIGN KEY constraint failed/)
    }
  })
})
