import { sql } from "drizzle-orm"
import { type Platform, sqlStatement } from "../../../platform"

export type MediaOwner = { kind: "cart" | "order"; id: number }

export type OwnedMedia = { mime: string | null; bytes: number | null }

/**
 * The `ready` media among `ids` (public ids) owned by `owner`, in one read. Another cart's or
 * order's media is simply absent, so callers treat it like a missing file.
 */
export async function ownedMedia(
  platform: Pick<Platform, "batch">,
  owner: MediaOwner,
  ids: readonly string[],
): Promise<Map<string, OwnedMedia>> {
  const out = new Map<string, OwnedMedia>()
  if (ids.length === 0) return out
  const list = sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  )
  const [rows = []] = await platform.batch([
    sqlStatement(sql`SELECT "public_id", "mime", "bytes" FROM "media"
      WHERE "public_id" IN (${list}) AND "owner_kind" = ${owner.kind} AND "owner_id" = ${owner.id}
        AND "status" = 'ready'`),
  ])
  for (const r of rows) {
    out.set(String(r.public_id), {
      mime: r.mime === null ? null : String(r.mime),
      bytes: r.bytes === null ? null : Number(r.bytes),
    })
  }
  return out
}
