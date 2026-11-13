import { sql } from "drizzle-orm"
import { type Platform, sqlStatement } from "../../../platform"

export type PaymentMethodRow = {
  id: number
  code: string
  name: string
  position: number
  handlerCode: string
  handlerArgs: Record<string, unknown>
  checkerCode: string | null
  enabled: boolean
  channelIds: number[]
}

const json = (v: unknown): Record<string, unknown> =>
  typeof v === "string" && v !== "" ? (JSON.parse(v) as Record<string, unknown>) : {}

/** Every method + its `payment_method_channels` links in one `batch` (small table, kept in memory). */
export async function loadPaymentMethods(p: Pick<Platform, "batch">): Promise<PaymentMethodRow[]> {
  const [rows = [], links = []] = await p.batch([
    sqlStatement(sql`SELECT "id", "code", "name", "position", "handler_code", "handler_args",
      "checker_code", "enabled" FROM "payment_methods" ORDER BY "position", "id"`),
    sqlStatement(sql`SELECT "payment_method_id", "channel_id" FROM "payment_method_channels"`),
  ])
  const channels = new Map<number, number[]>()
  for (const l of links) {
    const id = Number(l.payment_method_id)
    channels.set(id, [...(channels.get(id) ?? []), Number(l.channel_id)])
  }
  return rows.map((r) => ({
    id: Number(r.id),
    code: String(r.code),
    name: String(r.name),
    position: Number(r.position),
    handlerCode: String(r.handler_code),
    handlerArgs: json(r.handler_args),
    checkerCode: r.checker_code == null ? null : String(r.checker_code),
    enabled: Boolean(r.enabled),
    channelIds: channels.get(Number(r.id)) ?? [],
  }))
}
