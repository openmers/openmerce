import { auditLog, secrets } from "@openmers/db"
import { describeOnTargets } from "@openmers/test-utils"
import { eq } from "drizzle-orm"
import { expect, it } from "vitest"
import { sqlitePlatform } from "../__testing__/sqlitePlatform"
import { SecretError } from "./demoMode"
import { hasSecret, type SecretRef, setSecret, useSecret } from "./vault"

const NOW = 1_700_000_000_000
const REF: SecretRef = { scope: "global", scopeId: 0, key: "payment.stripe.secret_key" }
const SYSTEM = { type: "system" } as const

describeOnTargets("sır kasası", (getDb) => {
  const awake = () => ({ ...sqlitePlatform(getDb()), secrets: { kek: "test-kek" } })
  const asleep = () => ({ ...sqlitePlatform(getDb()), secrets: {} })

  it("setSecret yalnız şifreli metin yazar; useSecret çözer; denetimde değer yok", async () => {
    const p = awake()
    expect(await hasSecret(p, REF)).toBe(false)
    await setSecret(p, REF, "sk_live_gizli", NOW, SYSTEM)
    expect(await hasSecret(p, REF)).toBe(true)

    const [row] = await p.db.select().from(secrets)
    expect(new TextDecoder("latin1").decode(new Uint8Array(row?.ciphertext ?? []))).not.toContain(
      "sk_live",
    )
    expect(row?.kekVersion).toBe(1)
    expect(await useSecret(p, REF, (v) => v.length)).toBe("sk_live_gizli".length)

    const audits = await p.db.select().from(auditLog)
    expect(audits).toHaveLength(1)
    expect(JSON.stringify(audits[0])).not.toContain("sk_live")

    // üzerine yazma aynı satırı günceller
    await setSecret(p, REF, "sk_live_yeni", NOW + 1, SYSTEM)
    expect(await p.db.select().from(secrets)).toHaveLength(1)
    expect(await useSecret(p, REF, (v) => v)).toBe("sk_live_yeni")
  })

  it("şifreli metin başka satıra kopyalanırsa çözülmez (AAD)", async () => {
    const p = awake()
    const other: SecretRef = { ...REF, key: "payment.stripe.webhook_secret" }
    await setSecret(p, REF, "a", NOW, SYSTEM)
    await setSecret(p, other, "b", NOW, SYSTEM)
    const [src] = await p.db.select().from(secrets).where(eq(secrets.key, REF.key))
    if (!src) throw new Error("satır yok")
    await p.db
      .update(secrets)
      .set({ ciphertext: src.ciphertext, iv: src.iv, kekVersion: src.kekVersion })
      .where(eq(secrets.key, other.key))
    await expect(useSecret(p, other, (v) => v)).rejects.toThrow()
  })

  it("KEK yokken kasa uykuda: setSecret açık hata, hasSecret false, useSecret hata", async () => {
    await setSecret(awake(), REF, "değer", NOW, SYSTEM)
    const p = asleep()
    await expect(setSecret(p, REF, "x", NOW, SYSTEM)).rejects.toMatchObject({
      code: "VAULT_ASLEEP",
    })
    await expect(setSecret(p, REF, "x", NOW, SYSTEM)).rejects.toBeInstanceOf(SecretError)
    expect(await hasSecret(p, REF)).toBe(false)
    await expect(useSecret(p, REF, (v) => v)).rejects.toMatchObject({ code: "VAULT_ASLEEP" })
  })

  it("olmayan sır SECRET_NOT_FOUND", async () => {
    await expect(useSecret(awake(), REF, (v) => v)).rejects.toMatchObject({
      code: "SECRET_NOT_FOUND",
    })
  })
})
