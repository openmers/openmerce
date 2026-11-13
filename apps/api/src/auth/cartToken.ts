/** Signed cart cookie (05-sepet §1: the anonymous cart's key is a signed cookie). */
export const CART_COOKIE = "om_c"
const MAX_AGE_S = 30 * 86_400

const encoder = new TextEncoder()

function b64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "")
}

function fromB64url(value: string): Uint8Array<ArrayBuffer> | null {
  try {
    const bin = atob(value.replaceAll("-", "+").replaceAll("_", "/"))
    return Uint8Array.from(bin, (c) => c.charCodeAt(0))
  } catch {
    return null
  }
}

export type CartSigner = {
  sign(cartPublicId: string): Promise<string>
  /** The cart public id when the signature holds (constant-time Web Crypto `verify`), else `null`. */
  verify(value: string): Promise<string | null>
}

/** HMAC-SHA-256 under a key derived from the auth secret (separate purpose label). */
export function createCartSigner(secret: string): CartSigner {
  const key = crypto.subtle.importKey(
    "raw",
    encoder.encode(`cart-cookie:${secret}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  )
  return {
    async sign(id) {
      const sig = await crypto.subtle.sign("HMAC", await key, encoder.encode(id))
      return `${id}.${b64url(new Uint8Array(sig))}`
    },
    async verify(value) {
      const dot = value.lastIndexOf(".")
      if (dot < 1) return null
      const id = value.slice(0, dot)
      const sig = fromB64url(value.slice(dot + 1))
      if (!sig) return null
      const ok = await crypto.subtle.verify("HMAC", await key, sig, encoder.encode(id))
      return ok ? id : null
    },
  }
}

export function readCookie(headers: Headers, name: string): string | null {
  for (const part of (headers.get("cookie") ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=")
    if (k === name) return decodeURIComponent(v.join("="))
  }
  return null
}

export function cartCookie(value: string, https: boolean): string {
  const secure = https ? "; Secure" : ""
  return `${CART_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${MAX_AGE_S}; HttpOnly; SameSite=Lax${secure}`
}
