import { ADMIN_UPLOADS, PUBLIC_CACHE_CONTROL } from "@openmers/core"
import type { Hono } from "hono"
import type { LocalStorage } from "../platform/node/localStorage"
import { STORAGE_ROUTE } from "../platform/node/localStorage"
import type { AppEnv } from "./env"
import { apiError } from "./errors"

/**
 * Serves the local disk driver (S3/R2 never come here): `GET` of `public/` keys is open and
 * cached for a year; private reads and every `PUT` need a valid signed link. Uploads are capped
 * at the largest upload policy; the type is checked on confirm, not here.
 */
export function mountLocalStorage(app: Hono<AppEnv>, storage: LocalStorage, now: () => number) {
  const keyOf = (path: string) => decodeURIComponent(path.slice(STORAGE_ROUTE.length))
  const signed = (
    c: { req: { query(k: string): string | undefined } },
    method: string,
    key: string,
  ) => storage.verify(method, key, c.req.query("expires"), c.req.query("sig"), now())

  app.get(`${STORAGE_ROUTE}*`, async (c) => {
    const key = keyOf(c.req.path)
    const isPublic = key.startsWith("public/")
    if (!isPublic && !signed(c, "GET", key)) return apiError(c, 403, "FORBIDDEN")
    const obj = await storage.get(key).catch(() => null)
    if (!obj) return apiError(c, 404, "NOT_FOUND")
    const headers: Record<string, string> = {
      "content-length": String(obj.size),
      "cache-control": isPublic ? PUBLIC_CACHE_CONTROL : "private, no-store",
      "x-content-type-options": "nosniff",
    }
    if (obj.contentType) headers["content-type"] = obj.contentType
    return new Response(obj.body, { headers })
  })

  app.put(`${STORAGE_ROUTE}*`, async (c) => {
    const key = keyOf(c.req.path)
    if (!signed(c, "PUT", key)) return apiError(c, 403, "FORBIDDEN")
    const length = Number(c.req.header("content-length"))
    if (!Number.isSafeInteger(length) || length > ADMIN_UPLOADS.maxBytes) {
      return apiError(c, 413, "INVALID_INPUT")
    }
    const body = new Uint8Array(await c.req.arrayBuffer())
    if (body.byteLength > ADMIN_UPLOADS.maxBytes) return apiError(c, 413, "INVALID_INPUT")
    await storage.put(key, body)
    return c.body(null, 200)
  })
}
