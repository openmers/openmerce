import { channels, PUBLIC_ID_PREFIXES } from "@openmers/db"
import { type SQL, sql } from "drizzle-orm"
import type { AtomicStatement, Db, Platform } from "../../../platform"
import { insertWithPublicId } from "../../ids"
import { ChannelError } from "../types"

export type NewChannel = Omit<
  typeof channels.$inferInsert,
  "id" | "publicId" | "settingsVersion" | "createdAt" | "updatedAt"
> & {
  /** If not given, an id with the `chn_` prefix is generated and retried on collision (item 6.6). */
  publicId?: string
}

/** To reference a channel newly inserted in the same `atomic()` (id not known yet). */
export function channelIdByPublicId(publicId: string): SQL {
  return sql`(SELECT ${channels.id} FROM ${channels} WHERE ${channels.publicId} = ${publicId})`
}

/** Rules validated in code (§3.2): the default currency and language must be in the allowed lists. */
export function insertChannelStatement(
  db: Db,
  input: NewChannel & { publicId: string },
  now: number,
): AtomicStatement {
  const lang = input.defaultLang ?? "en"
  if (!input.currencies.includes(input.defaultCurrency)) {
    throw new ChannelError("INVALID_CHANNEL", "currencies default_currency'yi içermeli")
  }
  if (!input.langs.includes(lang)) {
    throw new ChannelError("INVALID_CHANNEL", "langs default_lang'i içermeli")
  }
  return db
    .insert(channels)
    .values({ ...input, code: input.code.toLowerCase(), createdAt: now, updatedAt: now })
    .toSQL()
}

/** Writes the channel; returns the generated/used `public_id`. */
export async function insertChannel(
  p: Pick<Platform, "db" | "atomic">,
  input: NewChannel,
  now: number,
): Promise<string> {
  const { publicId, ...rest } = input
  // If the caller provided the id it is not regenerated: writing the same row twice is the caller's bug.
  if (publicId) {
    await p.atomic([insertChannelStatement(p.db, { ...rest, publicId }, now)])
    return publicId
  }
  return insertWithPublicId(
    p,
    (generated) => [insertChannelStatement(p.db, { ...rest, publicId: generated }, now)],
    { prefix: PUBLIC_ID_PREFIXES.channels },
  )
}
