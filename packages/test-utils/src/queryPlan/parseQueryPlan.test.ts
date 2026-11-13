import { describe, expect, it } from "vitest"
import { parseQueryPlan, type QueryPlanRow } from "./parseQueryPlan"

const plan = (...details: string[]): QueryPlanRow[] =>
  details.map((detail, id) => ({ id, parent: 0, notused: 0, detail }))

describe("parseQueryPlan", () => {
  it("an unindexed SCAN is a violation", () => {
    expect(parseQueryPlan(plan("SCAN channels"))).toEqual(["SCAN channels"])
  })

  it("indexed scans are not violations", () => {
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

  it("SCAN CONSTANT ROW and TEMP B-TREE are not violations", () => {
    expect(parseQueryPlan(plan("SCAN CONSTANT ROW", "USE TEMP B-TREE FOR ORDER BY"))).toEqual([])
  })

  it("a table on the allow list is not a violation, the other one is", () => {
    expect(parseQueryPlan(plan("SCAN channels", "SCAN settings"), ["channels"])).toEqual([
      "SCAN settings",
    ])
  })
})
