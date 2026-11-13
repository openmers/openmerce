import { describe, expect, it } from "vitest"
import {
  allPermissions,
  isPermission,
  PermissionError,
  registerAppPermissions,
  SUPER_ADMIN_ROLE,
} from "./registry"
import { resolvePermissions } from "./resolvePermissions"

const B2B = 1
const B2C = 2

describe("resolvePermissions", () => {
  it("rol kanal başına: B2B'de sipariş yöneticisi, B2C'de okuyucu", () => {
    const assignments = [
      { roleCode: "orders_manager", channelId: B2B, permissions: ["orders:read", "orders:write"] },
      { roleCode: "reader", channelId: B2C, permissions: ["orders:read"] },
    ]
    expect(resolvePermissions(assignments, B2B)).toEqual(new Set(["orders:read", "orders:write"]))
    expect(resolvePermissions(assignments, B2C)).toEqual(new Set(["orders:read"]))
    expect(resolvePermissions(assignments, 99)).toEqual(new Set())
  })

  it("null kanallı atama her kanalda (yeni açılan dahil) geçerli; izinler birleşir", () => {
    const assignments = [
      { roleCode: "reader", channelId: null, permissions: ["orders:read"] },
      { roleCode: "stock", channelId: B2B, permissions: ["stock:write"] },
    ]
    expect(resolvePermissions(assignments, B2B)).toEqual(new Set(["orders:read", "stock:write"]))
    expect(resolvePermissions(assignments, 42)).toEqual(new Set(["orders:read"]))
  })

  it("SuperAdmin kayıtlı her izni alır; başka kanaldaki SuperAdmin ataması etkisiz", () => {
    const all = resolvePermissions(
      [{ roleCode: SUPER_ADMIN_ROLE, channelId: null, permissions: [] }],
      B2C,
    )
    expect(all).toEqual(new Set(allPermissions()))
    expect(all.has("secrets:write")).toBe(true)

    const scoped = resolvePermissions(
      [{ roleCode: SUPER_ADMIN_ROLE, channelId: B2B, permissions: [] }],
      B2C,
    )
    expect(scoped.size).toBe(0)
  })

  it("sözlükte olmayan izin yok sayılır", () => {
    const set = resolvePermissions(
      [{ roleCode: "x", channelId: null, permissions: ["orders:read", "kaldirildi:yaz"] }],
      B2B,
    )
    expect(set).toEqual(new Set(["orders:read"]))
  })
})

describe("izin kaydı", () => {
  it("built-in app izin ekler; biçim ve çakışma denetlenir", () => {
    expect(isPermission("reviews:moderate")).toBe(false)
    registerAppPermissions("reviews", ["reviews:moderate"])
    expect(isPermission("reviews:moderate")).toBe(true)
    // aynı app'in yeniden kaydı (yeniden yükleme) hata değil
    registerAppPermissions("reviews", ["reviews:moderate"])

    expect(() => registerAppPermissions("other", ["reviews:moderate"])).toThrow(PermissionError)
    expect(() => registerAppPermissions("evil", ["orders:read"])).toThrow(PermissionError)
    expect(() => registerAppPermissions("bad", ["bicimsiz"])).toThrow(PermissionError)
    expect(() => registerAppPermissions("bad", ["Orders:Read"])).toThrow(PermissionError)
  })
})
