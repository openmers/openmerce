import { describe, expect, it } from "vitest"
import { z } from "zod"
import { registerAppSetting, registerSetting, SettingError } from "./registry"
import { resolveSetting, type SettingRow } from "./resolveSetting"

const g = (key: string, value: unknown): SettingRow => ({ scope: "global", scopeId: 0, key, value })
const c = (id: number, key: string, value: unknown): SettingRow => ({
  scope: "channel",
  scopeId: id,
  key,
  value,
})

describe("resolveSetting", () => {
  it("kanal değeri genel değeri ezer", () => {
    expect(resolveSetting("store.name", [g("store.name", "G"), c(2, "store.name", "K")], 2)).toBe(
      "K",
    )
  })

  it("kanal satırı yoksa genel; başka kanalın satırı karışmaz", () => {
    expect(resolveSetting("store.name", [g("store.name", "G"), c(3, "store.name", "X")], 2)).toBe(
      "G",
    )
  })

  it("ikisi de yoksa kod varsayılanı", () => {
    expect(resolveSetting("audit.retention_days", [], 2)).toBe(730)
  })

  it("admin_user ve customer kapsamı zincire karışmaz", () => {
    const rows: SettingRow[] = [
      { scope: "admin_user", scopeId: 2, key: "store.name", value: "U" },
      { scope: "customer", scopeId: 2, key: "store.name", value: "M" },
    ]
    expect(resolveSetting("store.name", rows, 2)).toBe("My Store")
  })

  it("bilinmeyen anahtar UNKNOWN_SETTING", () => {
    expect(() => resolveSetting("nope.key", [], null)).toThrow(SettingError)
  })
})

describe("registry", () => {
  it("app anahtarı önekle kaydolur; tekrar ve sır gibi anahtar reddedilir", () => {
    registerAppSetting("test-app", "mode", { schema: z.string(), default: "a", scopes: [] })
    expect(resolveSetting("test-app.mode", [], null)).toBe("a")
    expect(() =>
      registerAppSetting("test-app", "mode", { schema: z.string(), default: "a", scopes: [] }),
    ).toThrow(/zaten/)
    expect(() =>
      registerSetting("smtp.password", { schema: z.string(), default: "", scopes: [] }),
    ).toThrow(/sır/)
  })
})
