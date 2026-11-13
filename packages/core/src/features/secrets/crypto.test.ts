import { describe, expect, it } from "vitest"
import { constantTimeEqual, decryptSecret, encryptSecret, type SecretAddress } from "./crypto"

const KEK = "test-kek-0123456789"
const ADDR: SecretAddress = { scope: "global", scopeId: 0, key: "payment.stripe.secret_key" }

describe("secret crypto (AES-256-GCM + HKDF)", () => {
  it("round trip; IV is 12 bytes, the ciphertext does not contain the plaintext", async () => {
    const sealed = await encryptSecret(KEK, ADDR, "sk_live_çok_gizli")
    expect(sealed.iv.byteLength).toBe(12)
    expect(sealed.kekVersion).toBe(1)
    expect(new TextDecoder().decode(sealed.ciphertext)).not.toContain("sk_live")
    expect(await decryptSecret(KEK, ADDR, sealed)).toBe("sk_live_çok_gizli")
  })

  it("encrypting the same plaintext twice gives a different IV and ciphertext", async () => {
    const a = await encryptSecret(KEK, ADDR, "aynı")
    const b = await encryptSecret(KEK, ADDR, "aynı")
    expect(a.iv).not.toEqual(b.iv)
    expect(a.ciphertext).not.toEqual(b.ciphertext)
  })

  it("a tampered ciphertext, IV or tag is rejected", async () => {
    const sealed = await encryptSecret(KEK, ADDR, "değer")
    const flip = (u: Uint8Array, i: number) => {
      const c = u.slice()
      c[i] = (c[i] ?? 0) ^ 1
      return c
    }
    await expect(
      decryptSecret(KEK, ADDR, { ...sealed, ciphertext: flip(sealed.ciphertext, 0) }),
    ).rejects.toThrow()
    await expect(
      decryptSecret(KEK, ADDR, {
        ...sealed,
        ciphertext: flip(sealed.ciphertext, sealed.ciphertext.length - 1),
      }),
    ).rejects.toThrow()
    await expect(decryptSecret(KEK, ADDR, { ...sealed, iv: flip(sealed.iv, 5) })).rejects.toThrow()
  })

  it("does not decrypt with another row's address (AAD): scope, scope id and name are bound", async () => {
    const sealed = await encryptSecret(KEK, ADDR, "değer")
    for (const other of [
      { ...ADDR, scope: "channel" },
      { ...ADDR, scopeId: 1 },
      { ...ADDR, key: "payment.stripe.webhook_secret" },
    ]) {
      await expect(decryptSecret(KEK, other, sealed)).rejects.toThrow()
    }
  })

  it("a wrong KEK or wrong KEK version is rejected", async () => {
    const sealed = await encryptSecret(KEK, ADDR, "değer")
    await expect(decryptSecret("baska-kek", ADDR, sealed)).rejects.toThrow()
    await expect(decryptSecret(KEK, ADDR, { ...sealed, kekVersion: 2 })).rejects.toThrow()
  })

  it("a CryptoKey KEK (HKDF) is accepted too", async () => {
    const raw = crypto.getRandomValues(new Uint8Array(32))
    const kek = await crypto.subtle.importKey("raw", raw, "HKDF", false, ["deriveKey"])
    const sealed = await encryptSecret(kek, ADDR, "değer")
    expect(await decryptSecret(kek, ADDR, sealed)).toBe("değer")
  })
})

describe("constantTimeEqual", () => {
  it("equal, different and different length", async () => {
    expect(await constantTimeEqual("imza-abc", "imza-abc")).toBe(true)
    expect(await constantTimeEqual("imza-abc", "imza-abd")).toBe(false)
    expect(await constantTimeEqual("imza", "imza-abc")).toBe(false)
    expect(await constantTimeEqual("", "")).toBe(true)
    expect(await constantTimeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2]))).toBe(true)
    expect(await constantTimeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2, 0]))).toBe(false)
  })
})
