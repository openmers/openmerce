// AWS Signature V4 query presigning with Web Crypto only (Workers and Node, no SDK).
// Covers AWS S3 and S3-compatible endpoints (R2 S3 API, MinIO, Spaces, Backblaze).

export type S3Credentials = {
  accessKeyId: string
  secretAccessKey: string
  region: string
  /** e.g. `https://s3.amazonaws.com`, `https://<account>.r2.cloudflarestorage.com`. */
  endpoint: string
  bucket: string
  /** `true`: `endpoint/bucket/key` (R2, MinIO); `false`: `bucket.endpoint/key` (AWS). */
  pathStyle?: boolean
}

export type PresignInput = {
  method: "GET" | "PUT" | "HEAD" | "DELETE"
  key: string
  /** Seconds, 1..604800. */
  expiresIn: number
  now: number
}

const encoder = new TextEncoder()

const hex = (bytes: ArrayBuffer) =>
  [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("")

// RFC 3986 unreserved characters stay; everything else is percent-encoded (SigV4 rule).
const rfc3986 = (s: string) =>
  encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)

async function hmac(key: ArrayBuffer | Uint8Array<ArrayBuffer>, data: string) {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ])
  return crypto.subtle.sign("HMAC", k, encoder.encode(data))
}

function amzDate(now: number): string {
  return new Date(now)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "")
}

/** Object URL without query: virtual-hosted or path style. */
export function objectUrl(c: S3Credentials, key: string): URL {
  const base = new URL(c.endpoint)
  const path = key.split("/").map(rfc3986).join("/")
  if (c.pathStyle) return new URL(`${base.protocol}//${base.host}/${rfc3986(c.bucket)}/${path}`)
  return new URL(`${base.protocol}//${c.bucket}.${base.host}/${path}`)
}

/** A presigned URL (`X-Amz-*` query, `UNSIGNED-PAYLOAD`, only `host` signed). */
export async function presign(c: S3Credentials, input: PresignInput): Promise<string> {
  if (!Number.isInteger(input.expiresIn) || input.expiresIn < 1 || input.expiresIn > 604_800) {
    throw new Error("expiresIn must be 1..604800 seconds")
  }
  const url = objectUrl(c, input.key)
  const date = amzDate(input.now)
  const day = date.slice(0, 8)
  const scope = `${day}/${c.region}/s3/aws4_request`
  const params: [string, string][] = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${c.accessKeyId}/${scope}`],
    ["X-Amz-Date", date],
    ["X-Amz-Expires", String(input.expiresIn)],
    ["X-Amz-SignedHeaders", "host"],
  ]
  const query = params
    .map(([k, v]) => `${rfc3986(k)}=${rfc3986(v)}`)
    .sort()
    .join("&")
  const canonical = [
    input.method,
    url.pathname,
    query,
    `host:${url.host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n")
  const toSign = [
    "AWS4-HMAC-SHA256",
    date,
    scope,
    hex(await crypto.subtle.digest("SHA-256", encoder.encode(canonical))),
  ].join("\n")
  let key: ArrayBuffer = await hmac(encoder.encode(`AWS4${c.secretAccessKey}`), day)
  for (const part of [c.region, "s3", "aws4_request"]) key = await hmac(key, part)
  const signature = hex(await hmac(key, toSign))
  return `${url.origin}${url.pathname}?${query}&X-Amz-Signature=${signature}`
}
