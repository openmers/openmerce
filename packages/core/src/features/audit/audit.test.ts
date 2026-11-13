import { auditLog } from "@openmers/db"
import { describeOnTargets } from "@openmers/test-utils"
import { eq } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { sqlitePlatform } from "../__testing__/sqlitePlatform"
import { auditStatement } from "./auditStatement"
import { auditRowHash, canonicalAuditRow, canonicalJson } from "./chain"
import { newAuditPublicId } from "./publicId"
import { listAudit } from "./queries/listAudit"

const NOW = 1_700_000_000_000

function need<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`${what} yok`)
  return value
}

describe("audit zinciri (saf)", () => {
  it("canonicalJson anahtarları sıralar, dizi sırasını korur", () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: [3, { f: 4, e: 5 }] } })).toBe(
      '{"a":{"c":[3,{"e":5,"f":4}],"d":2},"b":1}',
    )
    expect(canonicalJson(undefined)).toBe("null")
    expect(canonicalJson([null, 1])).toBe("[null,1]")
  })

  it("public_id aud_ önekli 10 karakter Crockford base32", () => {
    expect(newAuditPublicId()).toMatch(/^aud_[0-9A-HJKMNP-TV-Z]{10}$/)
    expect(newAuditPublicId()).not.toBe(newAuditPublicId())
  })
})

describeOnTargets("audit sorguları", (getDb) => {
  const platform = () => sqlitePlatform(getDb())
  const entry = (publicId: string, action = "settings:write") => ({
    publicId,
    actor: { type: "admin" as const, id: 1 },
    action,
    entityType: "setting",
    entityPublicId: "global:0:store.name",
    after: { b: 1, a: 2 },
  })

  it("auditStatement tek başına yazmaz; geri alınırsa satır kalmaz", async () => {
    const p = platform()
    expect(await p.db.select().from(auditLog)).toHaveLength(0)
    await expect(
      p.atomic([
        auditStatement(p.db, entry("aud_same"), NOW),
        auditStatement(p.db, entry("aud_same"), NOW),
      ]),
    ).rejects.toThrow(/UNIQUE/)
    expect(await p.db.select().from(auditLog)).toHaveLength(0)
  })

  it("satır aktör, eylem ve önce/sonra özetini yazar; zincir alanları boş kalır", async () => {
    const p = platform()
    await p.atomic([auditStatement(p.db, entry("aud_a"), NOW)])
    const row = need((await p.db.select().from(auditLog))[0], "audit satırı")
    expect(row).toMatchObject({
      publicId: "aud_a",
      actorType: "admin",
      actorId: 1,
      action: "settings:write",
      entityType: "setting",
      entityPublicId: "global:0:store.name",
      after: { a: 2, b: 1 },
      createdAt: NOW,
      prevHash: null,
      rowHash: null,
    })
  })

  it("zincir özeti SHA-256(prev ‖ kanonik satır); satır veya prev değişince değişir", async () => {
    const p = platform()
    await p.atomic([auditStatement(p.db, entry("aud_a"), NOW)])
    const row = need((await p.db.select().from(auditLog))[0], "audit satırı")
    const canonical = canonicalAuditRow(row)
    const hash = await auditRowHash(null, row)
    const expected = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical))),
      (b) => b.toString(16).padStart(2, "0"),
    ).join("")
    expect(hash).toBe(expected)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(await auditRowHash("abc", row)).not.toBe(hash)
    expect(await auditRowHash(null, { ...row, action: "other" })).not.toBe(hash)
  })

  it("listAudit imleçle azalan sırada sayfalar ve süzgeçleri uygular", async () => {
    const p = platform()
    await p.atomic([
      auditStatement(p.db, entry("aud_1", "a:write"), NOW),
      auditStatement(p.db, entry("aud_2", "b:write"), NOW + 1),
      auditStatement(p.db, entry("aud_3", "b:write"), NOW + 2),
    ])
    const first = await listAudit(p.db, { limit: 2 })
    expect(first.items.map((r) => r.publicId)).toEqual(["aud_3", "aud_2"])
    expect(first.nextCursor).toBe(2)

    const second = await listAudit(p.db, { limit: 2, cursor: 2 })
    expect(second.items.map((r) => r.publicId)).toEqual(["aud_1"])
    expect(second.nextCursor).toBeNull()

    const filtered = await listAudit(p.db, { action: "b:write", actorId: 1 })
    expect(filtered.items.map((r) => r.publicId)).toEqual(["aud_3", "aud_2"])
    expect(await listAudit(p.db, { actorType: "system" })).toEqual({
      items: [],
      nextCursor: null,
    })
  })

  it("listAudit tek satırlık ayrıntıyı public_id ile getirir", async () => {
    const p = platform()
    await p.atomic([auditStatement(p.db, entry("aud_one"), NOW)])
    const rows = await p.db.select().from(auditLog).where(eq(auditLog.publicId, "aud_one"))
    expect(rows).toHaveLength(1)
  })
})
