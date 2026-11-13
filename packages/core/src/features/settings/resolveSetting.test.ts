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
  it("the channel value overrides the global value", () => {
    expect(resolveSetting("store.name", [g("store.name", "G"), c(2, "store.name", "K")], 2)).toBe(
      "K",
    )
  })

  it("global if there is no channel row; another channel's row does not interfere", () => {
    expect(resolveSetting("store.name", [g("store.name", "G"), c(3, "store.name", "X")], 2)).toBe(
      "G",
    )
  })

  it("the code default if neither exists", () => {
    expect(resolveSetting("audit.retention_days", [], 2)).toBe(730)
  })

  it("admin_user and customer scopes do not enter the chain", () => {
    const rows: SettingRow[] = [
      { scope: "admin_user", scopeId: 2, key: "store.name", value: "U" },
      { scope: "customer", scopeId: 2, key: "store.name", value: "M" },
    ]
    expect(resolveSetting("store.name", rows, 2)).toBe("My Store")
  })

  it("unknown key UNKNOWN_SETTING", () => {
    expect(() => resolveSetting("nope.key", [], null)).toThrow(SettingError)
  })
})

describe("registry", () => {
  it("an app key registers with a prefix; duplicates and secret-like keys are rejected", () => {
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
