// Sır kasası kriptosu (06-guvenlik-ve-yetki "Sır kasası"): yalnız Web Crypto, AES-256-GCM.
// KEK doğrudan kullanılmaz: HKDF-SHA-256 ile sürüme bağlı bir veri anahtarı türetilir.

/** Şu an yazılan KEK sürümü; döndürme komutu gelince platformdan gelir. */
export const CURRENT_KEK_VERSION = 1

const IV_BYTES = 12
const HKDF_SALT = new TextEncoder().encode("openmers/secrets/hkdf-salt")
const encoder = new TextEncoder()

export type Kek = CryptoKey | string

/** Şifreli metnin bağlandığı satır kimliği; başka satıra kopyalanan şifreli metin çözülmez. */
export type SecretAddress = { scope: string; scopeId: number; key: string }

export type SealedSecret = {
  ciphertext: Uint8Array<ArrayBuffer>
  iv: Uint8Array<ArrayBuffer>
  kekVersion: number
}

/** `string` KEK UTF-8 bayt olarak HKDF girdisidir; `CryptoKey` ise `HKDF` + `deriveKey` olmalı. */
async function kekMaterial(kek: Kek): Promise<CryptoKey> {
  if (typeof kek !== "string") return kek
  if (kek.length === 0) throw new Error("KEK boş")
  return crypto.subtle.importKey("raw", encoder.encode(kek), "HKDF", false, ["deriveKey"])
}

/** HKDF-SHA-256(salt sabit, info = "openmers/secrets/v<sürüm>") → AES-256-GCM anahtarı. */
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

/** AAD: `JSON.stringify([scope, scopeId, key])` UTF-8; JSON dizisi alan sınırlarını belirsiz bırakmaz. */
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
  // Saklama: ciphertext = GCM çıktısı (şifreli metin ‖ 16 bayt etiket), iv ayrı sütun.
  return { ciphertext: new Uint8Array(out), iv, kekVersion }
}

/** Kurcalanmış şifreli metin/IV/AAD ya da yanlış KEK'te Web Crypto `OperationError` fırlatır. */
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
 * Sabit zamanlı eşitlik (webhook imzaları, token karşılaştırma). İki girdi rastgele tek kullanımlık
 * anahtarla HMAC-SHA-256'dan geçirilir, sabit uzunluklu özetler erken çıkışsız karşılaştırılır;
 * böylece uzunluk farkı ve ilk farklı baytın yeri zamanlamadan sızmaz.
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
