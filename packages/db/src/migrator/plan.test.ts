import { describe, expect, it } from "vitest"
import { MigrationPlanError, orderMigrations, planMigrations } from "./plan"

const files = ["0002_channels.sql", "0000_baseline.sql", "0001_settings.sql"]

describe("orderMigrations", () => {
  it("sorts by number", () => {
    expect(orderMigrations(files)).toEqual([
      "0000_baseline.sql",
      "0001_settings.sql",
      "0002_channels.sql",
    ])
  })

  it("empty list is valid", () => {
    expect(orderMigrations([])).toEqual([])
  })

  it("throws on a number gap", () => {
    expect(() => orderMigrations(["0000_baseline.sql", "0002_channels.sql"])).toThrow(/0001 yok/)
  })

  it("throws if it does not start at 0000", () => {
    expect(() => orderMigrations(["0001_settings.sql"])).toThrow(MigrationPlanError)
  })

  it("throws on a duplicate number", () => {
    expect(() =>
      orderMigrations(["0000_baseline.sql", "0001_settings.sql", "0001_other.sql"]),
    ).toThrow(/tekrarlanan/)
  })

  it("rejects an invalid name", () => {
    for (const bad of ["0000_Baseline.sql", "000_x.sql", "0000_x.ts", "0000_happy_hulk.sql"]) {
      expect(() => orderMigrations([bad])).toThrow(/geçersiz/)
    }
  })
})

describe("planMigrations", () => {
  it("if none applied, all are pending in order", () => {
    expect(planMigrations(files, [])).toEqual([
      "0000_baseline.sql",
      "0001_settings.sql",
      "0002_channels.sql",
    ])
  })

  it("skips applied ones", () => {
    expect(planMigrations(files, ["0000_baseline.sql", "0001_settings.sql"])).toEqual([
      "0002_channels.sql",
    ])
  })

  it("empty if all applied", () => {
    expect(planMigrations(files, files)).toEqual([])
  })

  it("throws on a record with no file", () => {
    expect(() => planMigrations(files, ["0000_baseline.sql", "0009_gone.sql"])).toThrow(
      /dosyası olmayan/,
    )
  })

  it("throws on a missing application in between", () => {
    expect(() => planMigrations(files, ["0000_baseline.sql", "0002_channels.sql"])).toThrow(
      /sıra dışı: 0001_settings.sql/,
    )
  })
})
