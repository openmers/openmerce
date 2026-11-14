import { createHmac, timingSafeEqual } from "node:crypto"
import { createReadStream } from "node:fs"
import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { Readable } from "node:stream"
import type { Storage, StorageBody } from "@openmers/core"

export type LocalStorageOptions = {
  /** Root folder, e.g. `data/uploads` (outside Litestream; back it up separately). */
  dir: string
  /** Origin the API is reached at; objects are served from `<baseUrl>/storage/<key>`. */
  baseUrl: string
  /** HMAC key of signed links. */
  secret: string
}

export type LocalStorage = Storage & {
  /** Signature check of a `/storage/<key>?expires=&sig=` request. */
  verify(
    method: string,
    key: string,
    expires: string | undefined,
    sig: string | undefined,
    now: number,
  ): boolean
}

export const STORAGE_ROUTE = "/storage/"

const TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
}

/** `public/...` or `private/...`, no `..`, no empty segment: keys can never leave `dir`. */
export function isSafeKey(key: string): boolean {
  return (
    /^(public|private)(\/[A-Za-z0-9_.-]+)+$/.test(key) &&
    !key.split("/").some((s) => s === "." || s === "..")
  )
}

async function toBuffer(body: StorageBody): Promise<Uint8Array> {
  if (typeof body === "string") return Buffer.from(body)
  if (body instanceof ArrayBuffer) return new Uint8Array(body)
  if (body instanceof Uint8Array) return body
  return new Uint8Array(await new Response(body).arrayBuffer())
}

/** Local disk driver (development and small VPS; 12-medya `local`). Node only. */
export function localStorage(opts: LocalStorageOptions): LocalStorage {
  const base = opts.baseUrl.replace(/\/+$/, "")
  const pathOf = (key: string) => {
    if (!isSafeKey(key)) throw new Error(`invalid storage key: ${key}`)
    return join(opts.dir, key)
  }
  const sign = (method: string, key: string, expires: number) =>
    createHmac("sha256", opts.secret).update(`${method}\n${key}\n${expires}`).digest("hex")
  const meta = async (key: string) => {
    const s = await stat(pathOf(key)).catch(() => null)
    if (!s?.isFile()) return null
    return { size: s.size, contentType: TYPES[key.split(".").pop() ?? ""] }
  }

  return {
    async put(key, body) {
      const path = pathOf(key)
      await mkdir(dirname(path), { recursive: true })
      // temp + rename: a reader never sees a half-written file
      const tmp = `${path}.${process.pid}.${Date.now()}.tmp`
      await writeFile(tmp, await toBuffer(body))
      await rename(tmp, path)
    },
    async get(key) {
      const m = await meta(key)
      if (!m) return null
      const body = Readable.toWeb(createReadStream(pathOf(key))) as ReadableStream<Uint8Array>
      return { ...m, body }
    },
    async delete(key) {
      await rm(pathOf(key), { force: true })
    },
    head: meta,
    url: (key) => `${base}${STORAGE_ROUTE}${key}`,
    async signedUrl(key, o) {
      pathOf(key)
      const expires = o.now + o.expiresIn * 1000
      return `${base}${STORAGE_ROUTE}${key}?expires=${expires}&sig=${sign(o.method, key, expires)}`
    },
    verify(method, key, expires, sig, now) {
      const at = Number(expires)
      if (!isSafeKey(key) || !Number.isSafeInteger(at) || at < now || !sig) return false
      const want = Buffer.from(sign(method, key, at), "hex")
      const got = Buffer.from(sig, "hex")
      return got.length === want.length && timingSafeEqual(got, want)
    },
  }
}
