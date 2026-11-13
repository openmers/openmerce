import { describe, expect, it } from "vitest"
import { parseQueryPlan, type QueryPlanRow } from "./parseQueryPlan"

const plan = (...details: string[]): QueryPlanRow[] =>
  details.map((detail, id) => ({ id, parent: 0, notused: 0, detail }))

describe("parseQueryPlan", () => {
  it("indekssiz SCAN ihlaldir", () => {
    expect(parseQueryPlan(plan("SCAN channels"))).toEqual(["SCAN channels"])
  })

  it("indeksli taramalar ihlal değil", () => {
    expect(
      parseQueryPlan(
        plan(
          "SCAN channels USING INDEX channels_code_uq",
          "SCAN channels USING COVERING INDEX channels_code_uq",
          "SCAN settings USING INTEGER PRIMARY KEY (rowid>?)",
          "SEARCH channel_domains USING INDEX channel_domains_domain_uq (domain=?)",
        ),
      ),
    ).toEqual([])
  })

  it("SCAN CONSTANT ROW ve TEMP B-TREE ihlal değil", () => {
    expect(parseQueryPlan(plan("SCAN CONSTANT ROW", "USE TEMP B-TREE FOR ORDER BY"))).toEqual([])
  })

  it("allow listesindeki tablo ihlal değil, diğeri ihlal", () => {
    expect(parseQueryPlan(plan("SCAN channels", "SCAN settings"), ["channels"])).toEqual([
      "SCAN settings",
    ])
  })
})
