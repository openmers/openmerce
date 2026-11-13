import { channels } from "@openmers/db"
import { type SQL, sql } from "drizzle-orm"
import type { AtomicStatement, Db, Platform } from "../../../platform"
import { ChannelError } from "../types"

export type NewChannel = Omit<
  typeof channels.$inferInsert,
  "id" | "settingsVersion" | "createdAt" | "updatedAt"
>

/** Aynı `atomic()` içinde yeni eklenen kanala başvurmak için (id henüz bilinmiyor). */
export function channelIdByPublicId(publicId: string): SQL {
  return sql`(SELECT ${channels.id} FROM ${channels} WHERE ${channels.publicId} = ${publicId})`
}

/** Kodda doğrulanan kurallar (§3.2): varsayılan para birimi ve dil izinli listelerde olmalı. */
export function insertChannelStatement(db: Db, input: NewChannel, now: number): AtomicStatement {
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

// shortcut: public_id çakışmasında yeniden deneme yok (madde 6.6, newPublicId gelince); çağıran üretir.
export async function insertChannel(
  p: Pick<Platform, "db" | "atomic">,
  input: NewChannel,
  now: number,
): Promise<void> {
  await p.atomic([insertChannelStatement(p.db, input, now)])
}
