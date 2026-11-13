import { channels, PUBLIC_ID_PREFIXES } from "@openmers/db"
import { type SQL, sql } from "drizzle-orm"
import type { AtomicStatement, Db, Platform } from "../../../platform"
import { insertWithPublicId } from "../../ids"
import { ChannelError } from "../types"

export type NewChannel = Omit<
  typeof channels.$inferInsert,
  "id" | "publicId" | "settingsVersion" | "createdAt" | "updatedAt"
> & {
  /** Verilmezse `chn_` önekli kimlik üretilir ve çakışmada yeniden denenir (madde 6.6). */
  publicId?: string
}

/** Aynı `atomic()` içinde yeni eklenen kanala başvurmak için (id henüz bilinmiyor). */
export function channelIdByPublicId(publicId: string): SQL {
  return sql`(SELECT ${channels.id} FROM ${channels} WHERE ${channels.publicId} = ${publicId})`
}

/** Kodda doğrulanan kurallar (§3.2): varsayılan para birimi ve dil izinli listelerde olmalı. */
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

/** Kanalı yazar; üretilen/kullanılan `public_id`'yi döner. */
export async function insertChannel(
  p: Pick<Platform, "db" | "atomic">,
  input: NewChannel,
  now: number,
): Promise<string> {
  const { publicId, ...rest } = input
  // Çağıran kimliği verdiyse yeniden üretilmez: aynı satırı ikinci kez yazmak onun hatasıdır.
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
