import type { Storage, StorageBody } from "../../../../platform"

type Entry = { bytes: Uint8Array<ArrayBuffer>; contentType?: string }

async function toBytes(body: StorageBody): Promise<Uint8Array<ArrayBuffer>> {
  if (typeof body === "string") return new TextEncoder().encode(body)
  // copy: the caller may reuse its buffer
  if (body instanceof Uint8Array) return new Uint8Array(body)
  if (body instanceof ArrayBuffer) return new Uint8Array(body)
  return new Uint8Array(await new Response(body).arrayBuffer())
}

/** In-memory driver for tests and demos; `keys()` exposes what is stored. */
export function memoryStorage(opts: { baseUrl?: string } = {}): Storage & { keys(): string[] } {
  const base = opts.baseUrl ?? "https://media.test"
  const objects = new Map<string, Entry>()
  return {
    async put(key, body, o) {
      objects.set(key, { bytes: await toBytes(body), contentType: o?.contentType })
    },
    async get(key) {
      const e = objects.get(key)
      if (!e) return null
      return {
        size: e.bytes.byteLength,
        contentType: e.contentType,
        body: new Blob([e.bytes]).stream(),
      }
    },
    async delete(key) {
      objects.delete(key)
    },
    async head(key) {
      const e = objects.get(key)
      return e ? { size: e.bytes.byteLength, contentType: e.contentType } : null
    },
    url: (key) => `${base}/${key}`,
    signedUrl: async (key, o) =>
      `${base}/${key}?method=${o.method}&expires=${o.now + o.expiresIn * 1000}`,
    keys: () => [...objects.keys()],
  }
}
