import { sql } from "drizzle-orm"
import { type Platform, sqlStatement } from "../../../platform"
import { getOrder, type OrderView } from "./getOrder"

export const GUEST_TOKEN_PREFIX = "otk_"

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

/**
 * Guest order access (07-siparis §7, 03-veri-kurallari): knowing `ord_…` is not enough; a
 * revocable `otk_…` bearer token is. Only its SHA-256 is stored (`order_guest_access`).
 */
export async function issueGuestToken(
  ctx: { platform: Pick<Platform, "atomic">; now: number },
  orderPublicId: string,
): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  const body = btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "")
  const token = `${GUEST_TOKEN_PREFIX}${body}`
  await ctx.platform.atomic([
    sqlStatement(sql`INSERT INTO "order_guest_access" ("order_id", "token_hash", "created_at",
        "updated_at")
      SELECT "id", ${await sha256Hex(token)}, ${ctx.now}, ${ctx.now} FROM "orders"
      WHERE "public_id" = ${orderPublicId}`),
  ])
  return token
}

/** Order for a guest token in this channel; unknown, revoked or other-channel token is `null`. */
export async function getGuestOrder(
  p: Pick<Platform, "batch">,
  input: { token: string; channelId: number },
): Promise<OrderView | null> {
  if (!input.token.startsWith(GUEST_TOKEN_PREFIX)) return null
  const [rows = []] = await p.batch([
    sqlStatement(sql`SELECT o."public_id" FROM "order_guest_access" g
      JOIN "orders" o ON o."id" = g."order_id"
      WHERE g."token_hash" = ${await sha256Hex(input.token)} AND g."revoked_at" IS NULL
        AND o."channel_id" = ${input.channelId}`),
  ])
  const row = rows[0]
  if (!row) return null
  return getOrder(p, { orderPublicId: String(row.public_id), channelId: input.channelId })
}
