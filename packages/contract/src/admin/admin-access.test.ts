import { describe, expect, it } from "vitest"
import { getAdminAccess } from "../shared/adminProcedure"
import { admin } from "./index"

type Node = { "~orpc"?: { meta: Record<PropertyKey, unknown> } } | Record<string, unknown>

function procedures(node: Node, path: string[] = []): [string, Node][] {
  if ("~orpc" in node) return [[path.join("."), node]]
  return Object.entries(node).flatMap(([k, v]) => procedures(v as Node, [...path, k]))
}

describe("admin sözleşmesi", () => {
  it("her Admin prosedürü erişim meta'sı bildirir", () => {
    const all = procedures(admin)
    expect(all.length).toBeGreaterThan(0)
    for (const [path, proc] of all) {
      expect(getAdminAccess(proc as never), path).toBeDefined()
    }
  })

  it("meta değerleri: setup/login/logout açık, me oturum ister", () => {
    expect(getAdminAccess(admin.setup.create)).toBe("public")
    expect(getAdminAccess(admin.me)).toBe("session")
  })
})
