import { channelDomains } from "@openmers/db"
import type { SQL } from "drizzle-orm"
import type { AtomicStatement, Db, Platform } from "../../../platform"
import { normalizeHost } from "../resolveChannel"

export type NewChannelDomain = {
  /** Channel id, or `channelIdByPublicId` for a channel inserted in the same `atomic()`. */
  channelId: number | SQL
  domain: string
  defaultLang?: string | null
  isPrimary?: boolean
  /** Only for secondaries; defaults to `serve`. Ignored for the primary (NULL). */
  secondaryMode?: "redirect" | "serve"
}

/** The domain is lowercased, port removed, trailing dot removed (the DB `check` only enforces lowercase). */
export function insertChannelDomainStatement(
  db: Db,
  input: NewChannelDomain,
  now: number,
): AtomicStatement {
  const isPrimary = input.isPrimary ?? false
  return db
    .insert(channelDomains)
    .values({
      channelId: input.channelId,
      domain: normalizeHost(input.domain),
      defaultLang: input.defaultLang ?? null,
      isPrimary,
      secondaryMode: isPrimary ? null : (input.secondaryMode ?? "serve"),
      createdAt: now,
      updatedAt: now,
    })
    .toSQL()
}

export async function insertChannelDomain(
  p: Pick<Platform, "db" | "atomic">,
  input: NewChannelDomain,
  now: number,
): Promise<void> {
  await p.atomic([insertChannelDomainStatement(p.db, input, now)])
}
