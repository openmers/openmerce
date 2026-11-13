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
  it("roles are per channel: order manager in B2B, reader in B2C", () => {
    const assignments = [
      { roleCode: "orders_manager", channelId: B2B, permissions: ["orders:read", "orders:write"] },
      { roleCode: "reader", channelId: B2C, permissions: ["orders:read"] },
    ]
    expect(resolvePermissions(assignments, B2B)).toEqual(new Set(["orders:read", "orders:write"]))
    expect(resolvePermissions(assignments, B2C)).toEqual(new Set(["orders:read"]))
    expect(resolvePermissions(assignments, 99)).toEqual(new Set())
  })

  it("an assignment with a null channel applies to every channel (including newly opened ones); permissions merge", () => {
    const assignments = [
      { roleCode: "reader", channelId: null, permissions: ["orders:read"] },
      { roleCode: "stock", channelId: B2B, permissions: ["stock:write"] },
    ]
    expect(resolvePermissions(assignments, B2B)).toEqual(new Set(["orders:read", "stock:write"]))
    expect(resolvePermissions(assignments, 42)).toEqual(new Set(["orders:read"]))
  })

  it("SuperAdmin gets every registered permission; a SuperAdmin assignment on another channel has no effect", () => {
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

  it("a permission not in the dictionary is ignored", () => {
    const set = resolvePermissions(
      [{ roleCode: "x", channelId: null, permissions: ["orders:read", "kaldirildi:yaz"] }],
      B2B,
    )
    expect(set).toEqual(new Set(["orders:read"]))
  })
})

describe("permission registry", () => {
  it("a built-in app adds permissions; format and collisions are checked", () => {
    expect(isPermission("reviews:moderate")).toBe(false)
    registerAppPermissions("reviews", ["reviews:moderate"])
    expect(isPermission("reviews:moderate")).toBe(true)
    // re-registering the same app (reload) is not an error
    registerAppPermissions("reviews", ["reviews:moderate"])

    expect(() => registerAppPermissions("other", ["reviews:moderate"])).toThrow(PermissionError)
    expect(() => registerAppPermissions("evil", ["orders:read"])).toThrow(PermissionError)
    expect(() => registerAppPermissions("bad", ["bicimsiz"])).toThrow(PermissionError)
    expect(() => registerAppPermissions("bad", ["Orders:Read"])).toThrow(PermissionError)
  })
})
