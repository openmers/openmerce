import { expect, it } from "vitest"
import { describeOnTargets } from "../runner"
import { assertNoFullScan } from "./assertNoFullScan"

// EXPLAIN QUERY PLAN yalnız SQLite'ta doğrulandı (plan §2.4); D1 hedefi gelince burası gözden geçirilir.
describeOnTargets("assertNoFullScan", (getDb) => {
  it("indekssiz sorguda kırılır", () => {
    expect(() =>
      assertNoFullScan(getDb(), "SELECT id FROM channel_domains WHERE default_lang = 'en'"),
    ).toThrow(/tam tarama: SCAN channel_domains/)
  })

  it("channel_domains.domain sorgusu indeksle geçer", () => {
    expect(() =>
      assertNoFullScan(getDb(), {
        sql: "SELECT channel_id FROM channel_domains WHERE domain = ?",
        params: ["shop.test"],
      }),
    ).not.toThrow()
  })

  it("allow ile bilerek taranan tablo geçer", () => {
    // channels küçük ve bellekte tutulur; tam tarama kabul.
    expect(() =>
      assertNoFullScan(getDb(), "SELECT id FROM channels WHERE timezone = 'UTC'", {
        allow: ["channels"],
      }),
    ).not.toThrow()
  })
})
