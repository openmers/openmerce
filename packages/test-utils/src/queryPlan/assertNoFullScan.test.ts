import { expect, it } from "vitest"
import { describeOnTargets } from "../runner"
import { assertNoFullScan } from "./assertNoFullScan"

// EXPLAIN QUERY PLAN is only verified on SQLite (plan §2.4); revisit once the D1 target lands.
describeOnTargets("assertNoFullScan", (getDb) => {
  it("fails on an unindexed query", () => {
    expect(() =>
      assertNoFullScan(getDb(), "SELECT id FROM channel_domains WHERE default_lang = 'en'"),
    ).toThrow(/tam tarama: SCAN channel_domains/)
  })

  it("a channel_domains.domain query passes through the index", () => {
    expect(() =>
      assertNoFullScan(getDb(), {
        sql: "SELECT channel_id FROM channel_domains WHERE domain = ?",
        params: ["shop.test"],
      }),
    ).not.toThrow()
  })

  it("a table scanned on purpose passes with allow", () => {
    // channels is small and kept in memory; a full scan is acceptable.
    expect(() =>
      assertNoFullScan(getDb(), "SELECT id FROM channels WHERE timezone = 'UTC'", {
        allow: ["channels"],
      }),
    ).not.toThrow()
  })
})
