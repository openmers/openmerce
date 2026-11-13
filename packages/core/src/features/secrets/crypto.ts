// Secret vault crypto (06-guvenlik-ve-yetki "Secret vault"): Web Crypto only, AES-256-GCM.
// The KEK is not used directly: a version-bound data key is derived with HKDF-SHA-256.

/** The KEK version currently written; comes from the platform once the rotation command exists. */
export const CURRENT_KEK_VERSION = 1

const IV_BYTES = 12
const HKDF_SALT = new TextEncoder().encode("openmers/secrets/hkdf-salt")
const encoder = new TextEncoder()

export type Kek = CryptoKey | string

/** Row id the ciphertext is bound to; a ciphertext copied to another row does not decrypt. */
export type SecretAddress = { scope: string; scopeId: number; key: string }

export type SealedSecret = {
  ciphertext: Uint8Array<ArrayBuffer>
  iv: Uint8Array<ArrayBuffer>
  kekVersion: number
}

/** A `string` KEK is HKDF input as UTF-8 bytes; a `CryptoKey` must be `HKDF` + `deriveKey`. */
async function kekMaterial(kek: Kek): Promise<CryptoKey> {
  if (typeof kek !== "string") return kek
  if (kek.length === 0) throw new Error("KEK boş")
  return crypto.subtle.importKey("raw", encoder.encode(kek), "HKDF", false, ["deriveKey"])
}

/** HKDF-SHA-256(fixed salt, info = "openmers/secrets/v<version>") → AES-256-GCM key. */
export async function deriveDataKey(kek: Kek, kekVersion: number): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: HKDF_SALT,
      info: encoder.encode(`openmers/secrets/v${kekVersion}`),
    },
    await kekMaterial(kek),
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  )
}

/** AAD: `JSON.stringify([scope, scopeId, key])` as UTF-8; a JSON array leaves no ambiguous field boundaries. */
export function secretAad(addr: SecretAddress): Uint8Array<ArrayBuffer> {
  return encoder.encode(JSON.stringify([addr.scope, addr.scopeId, addr.key]))
}

export async function encryptSecret(
  kek: Kek,
  addr: SecretAddress,
  plaintext: string,
  kekVersion = CURRENT_KEK_VERSION,
): Promise<SealedSecret> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const key = await deriveDataKey(kek, kekVersion)
  const out = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: secretAad(addr) },
    key,
    encoder.encode(plaintext),
  )
  // Storage: ciphertext = GCM output (ciphertext ‖ 16-byte tag), iv in a separate column.
  return { ciphertext: new Uint8Array(out), iv, kekVersion }
}

/** Web Crypto throws `OperationError` on tampered ciphertext/IV/AAD or a wrong KEK. */
export async function decryptSecret(
  kek: Kek,
  addr: SecretAddress,
  sealed: SealedSecret,
): Promise<string> {
  if (sealed.iv.byteLength !== IV_BYTES) throw new Error("IV 12 bayt olmalı")
  const key = await deriveDataKey(kek, sealed.kekVersion)
  const out = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: sealed.iv, additionalData: secretAad(addr) },
    key,
    sealed.ciphertext,
  )
  return new TextDecoder("utf-8", { fatal: true }).decode(out)
}

function bytes(v: string | Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
  return typeof v === "string" ? encoder.encode(v) : v
}

/**
 * Constant-time equality (webhook signatures, token comparison). Both inputs go through HMAC-SHA-256 with
 * a random one-time key, and the fixed-length digests are compared without early exit;
 * so neither a length difference nor the position of the first differing byte leaks through timing.
 */
export async function constantTimeEqual(
  a: string | Uint8Array<ArrayBuffer>,
  b: string | Uint8Array<ArrayBuffer>,
): Promise<boolean> {
  const key = await crypto.subtle.generateKey({ name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const [ha, hb] = await Promise.all([
    crypto.subtle.sign("HMAC", key, bytes(a)),
    crypto.subtle.sign("HMAC", key, bytes(b)),
  ])
  const x = new Uint8Array(ha)
  const y = new Uint8Array(hb)
  let diff = 0
  for (let i = 0; i < x.length; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0)
  return diff === 0
}
