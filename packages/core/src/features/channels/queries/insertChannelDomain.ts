import { channelDomains } from "@openmers/db"
import type { SQL } from "drizzle-orm"
import type { AtomicStatement, Db, Platform } from "../../../platform"
import { normalizeHost } from "../resolveChannel"

export type NewChannelDomain = {
  /** Kanal id'si ya da aynı `atomic()`'te eklenen kanal için `channelIdByPublicId`. */
  channelId: number | SQL
  domain: string
  defaultLang?: string | null
  isPrimary?: boolean
  /** Yalnız ikincilde; verilmezse `serve`. Birincilde yok sayılır (NULL). */
  secondaryMode?: "redirect" | "serve"
}

/** Alan adı küçük harfe, portsuz, sonda noktasız çevrilir (DB `check` yalnız küçük harfi zorlar). */
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
