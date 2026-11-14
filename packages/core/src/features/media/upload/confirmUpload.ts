import { sql } from "drizzle-orm"
import { affected, type Storage, sqlStatement } from "../../../platform"
import { generateLadder } from "../images/port"
import { type MediaCtx, MediaError, type UploadPolicy } from "../types"
import { SNIFF_BYTES, sniffMagic } from "./sniffMagic"

export type ConfirmUploadInput = {
  id: string
  policy: UploadPolicy
  /** Only this owner's media can be confirmed (customer uploads); admin passes none. */
  owner?: { kind: "cart" | "order"; id: number }
}

export type ConfirmedUpload = {
  id: string
  status: "ready" | "rejected"
  mime: string | null
  bytes: number | null
  width: number | null
  height: number | null
  reason?: "too_large" | "type" | "dimensions"
}

/** The first `n` bytes of an object; the rest of the stream is cancelled. */
async function readHead(storage: Storage, key: string, n: number): Promise<Uint8Array | null> {
  const obj = await storage.get(key)
  if (!obj) return null
  const reader = obj.body.getReader()
  const out = new Uint8Array(n)
  let length = 0
  while (length < n) {
    const { done, value } = await reader.read()
    if (done) break
    const take = value.subarray(0, n - length)
    out.set(take, length)
    length += take.length
  }
  await reader.cancel().catch(() => undefined)
  return out.subarray(0, length)
}

async function readAll(storage: Storage, key: string): Promise<Uint8Array> {
  const obj = await storage.get(key)
  if (!obj) throw new Error("object vanished")
  return new Uint8Array(await new Response(obj.body).arrayBuffer())
}

/**
 * Step 2 (12-medya): HEAD for the real size, then the type and pixel size from the first bytes
 * (`sniffMagic`); the declared type must match. A violation marks the row `rejected` and deletes
 * the object. Public images get the WebP ladder when a processor exists; customer uploads are
 * never re-encoded. Confirming twice returns the stored outcome.
 */
export async function confirmUpload(
  ctx: MediaCtx,
  input: ConfirmUploadInput,
): Promise<ConfirmedUpload> {
  const p = ctx.platform
  const owner = input.owner
    ? sql`AND "owner_kind" = ${input.owner.kind} AND "owner_id" = ${input.owner.id}`
    : sql``
  const [rows = []] = await p.batch([
    sqlStatement(sql`SELECT "id", "status", "bucket", "key", "mime", "bytes", "width", "height"
      FROM "media" WHERE "public_id" = ${input.id} ${owner}`),
  ])
  const row = rows[0]
  if (!row) throw new MediaError("NOT_FOUND", "upload not found")
  const id = Number(row.id)
  const key = String(row.key)
  const current: ConfirmedUpload = {
    id: input.id,
    status: row.status === "ready" ? "ready" : "rejected",
    mime: row.mime === null ? null : String(row.mime),
    bytes: row.bytes === null ? null : Number(row.bytes),
    width: row.width === null ? null : Number(row.width),
    height: row.height === null ? null : Number(row.height),
  }
  if (row.status !== "pending") return current

  const meta = await p.storage.head(key)
  if (!meta) throw new MediaError("NOT_UPLOADED", "file not uploaded yet")
  const reject = async (reason: NonNullable<ConfirmedUpload["reason"]>) => {
    await p.atomic([
      sqlStatement(sql`UPDATE "media" SET "status" = 'rejected', "updated_at" = ${ctx.now}
        WHERE "id" = ${id} AND "status" = 'pending'`),
    ])
    await p.storage.delete(key)
    return { ...current, status: "rejected" as const, reason }
  }
  if (meta.size > input.policy.maxBytes) return reject("too_large")
  const sniffed = sniffMagic((await readHead(p.storage, key, SNIFF_BYTES)) ?? new Uint8Array())
  if (!sniffed || !input.policy.mimes.includes(sniffed.mime) || sniffed.mime !== current.mime) {
    return reject("type")
  }
  const max = input.policy.maxPixels
  if (sniffed.width > max || sniffed.height > max) return reject("dimensions")

  const sizes =
    row.bucket === "public"
      ? await generateLadder(p.images, p.storage, {
          key,
          width: sniffed.width,
          bytes: () => readAll(p.storage, key),
        })
      : []
  const result = await p.atomic([
    sqlStatement(sql`UPDATE "media" SET "status" = 'ready', "bytes" = ${meta.size},
      "width" = ${sniffed.width}, "height" = ${sniffed.height}, "sizes" = ${JSON.stringify(sizes)},
      "updated_at" = ${ctx.now} WHERE "id" = ${id} AND "status" = 'pending'`),
  ])
  // a concurrent confirm or the sweeper got there first: report what is stored now
  if (!affected(result, 0)) return confirmUpload(ctx, input)
  return {
    ...current,
    status: "ready",
    bytes: meta.size,
    width: sniffed.width,
    height: sniffed.height,
  }
}
