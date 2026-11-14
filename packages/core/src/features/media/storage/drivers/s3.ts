import type { Storage, StorageBody } from "../../../../platform"
import { presign, type S3Credentials } from "../presign"

export type S3StorageOptions = S3Credentials & {
  /** CDN or bucket domain serving `public/` keys, e.g. `https://media.example.com`. */
  publicBaseUrl: string
  fetch?: typeof fetch
}

/** Immutable keys (random or content digest), so a year of caching is safe. */
export const PUBLIC_CACHE_CONTROL = "public, max-age=31536000, immutable"

// every call is a short presigned request; one signing path for driver calls and links
const OP_TTL = 300

async function toBytes(body: StorageBody): Promise<BodyInit> {
  if (body instanceof ReadableStream) return new Response(body).arrayBuffer()
  return body instanceof Uint8Array ? new Uint8Array(body) : body
}

/**
 * S3-compatible driver (AWS S3, R2 S3 API, MinIO, Spaces, Backblaze) over `fetch` + SigV4.
 * shortcut: the real clock signs driver calls; a skewed host clock gets 403s from the provider.
 */
export function s3Storage(opts: S3StorageOptions): Storage {
  const doFetch = opts.fetch ?? fetch
  const base = opts.publicBaseUrl.replace(/\/+$/, "")
  const call = async (method: "GET" | "PUT" | "HEAD" | "DELETE", key: string, init?: RequestInit) =>
    doFetch(await presign(opts, { method, key, expiresIn: OP_TTL, now: Date.now() }), {
      ...init,
      method,
    })
  const fail = (op: string, res: Response) => new Error(`s3 ${op} failed: ${res.status}`)

  return {
    async put(key, body, o) {
      const headers: Record<string, string> = {}
      if (o?.contentType) headers["content-type"] = o.contentType
      if (key.startsWith("public/")) headers["cache-control"] = PUBLIC_CACHE_CONTROL
      const res = await call("PUT", key, { body: await toBytes(body), headers })
      if (!res.ok) throw fail("put", res)
    },
    async get(key) {
      const res = await call("GET", key)
      if (res.status === 404) return null
      if (!res.ok || !res.body) throw fail("get", res)
      return {
        size: Number(res.headers.get("content-length") ?? 0),
        contentType: res.headers.get("content-type") ?? undefined,
        etag: res.headers.get("etag") ?? undefined,
        body: res.body,
      }
    },
    async delete(key) {
      const res = await call("DELETE", key)
      if (!res.ok && res.status !== 404) throw fail("delete", res)
    },
    async head(key) {
      const res = await call("HEAD", key)
      if (res.status === 404) return null
      if (!res.ok) throw fail("head", res)
      return {
        size: Number(res.headers.get("content-length") ?? 0),
        contentType: res.headers.get("content-type") ?? undefined,
        etag: res.headers.get("etag") ?? undefined,
      }
    },
    url: (key) => `${base}/${key}`,
    signedUrl: (key, o) =>
      presign(opts, { method: o.method, key, expiresIn: o.expiresIn, now: o.now }),
  }
}
