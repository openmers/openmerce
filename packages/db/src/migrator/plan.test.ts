import { describe, expect, it } from "vitest"
import { MigrationPlanError, orderMigrations, planMigrations } from "./plan"

const files = ["0002_channels.sql", "0000_baseline.sql", "0001_settings.sql"]

describe("orderMigrations", () => {
  it("numara sırasına dizer", () => {
    expect(orderMigrations(files)).toEqual([
      "0000_baseline.sql",
      "0001_settings.sql",
      "0002_channels.sql",
    ])
  })

  it("boş liste geçerli", () => {
    expect(orderMigrations([])).toEqual([])
  })

  it("numara boşluğunda kırılır", () => {
    expect(() => orderMigrations(["0000_baseline.sql", "0002_channels.sql"])).toThrow(/0001 yok/)
  })

  it("0000 ile başlamazsa kırılır", () => {
    expect(() => orderMigrations(["0001_settings.sql"])).toThrow(MigrationPlanError)
  })

  it("tekrarlanan numarada kırılır", () => {
    expect(() =>
      orderMigrations(["0000_baseline.sql", "0001_settings.sql", "0001_other.sql"]),
    ).toThrow(/tekrarlanan/)
  })

  it("geçersiz adı reddeder", () => {
    for (const bad of ["0000_Baseline.sql", "000_x.sql", "0000_x.ts", "0000_happy_hulk.sql"]) {
      expect(() => orderMigrations([bad])).toThrow(/geçersiz/)
    }
  })
})

describe("planMigrations", () => {
  it("hiç uygulanmamışsa hepsi sırayla bekler", () => {
    expect(planMigrations(files, [])).toEqual([
      "0000_baseline.sql",
      "0001_settings.sql",
      "0002_channels.sql",
    ])
  })

  it("uygulanmışları atlar", () => {
    expect(planMigrations(files, ["0000_baseline.sql", "0001_settings.sql"])).toEqual([
      "0002_channels.sql",
    ])
  })

  it("hepsi uygulanmışsa boş", () => {
    expect(planMigrations(files, files)).toEqual([])
  })

  it("dosyası olmayan kayıtta kırılır", () => {
    expect(() => planMigrations(files, ["0000_baseline.sql", "0009_gone.sql"])).toThrow(
      /dosyası olmayan/,
    )
  })

  it("aradaki eksik uygulamada kırılır", () => {
    expect(() => planMigrations(files, ["0000_baseline.sql", "0002_channels.sql"])).toThrow(
      /sıra dışı: 0001_settings.sql/,
    )
  })
})
