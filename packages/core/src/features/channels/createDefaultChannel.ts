import type { Platform } from "../../platform"
import { channelIdByPublicId, insertChannelStatement } from "./queries/insertChannel"
import { insertChannelDomainStatement } from "./queries/insertChannelDomain"

export type DefaultChannelInput = {
  /** `chn_` önekli; `newPublicId` gelene kadar çağıran üretir. */
  publicId: string
  code?: string
  currency?: string
  lang?: string
  timezone?: string
  /** Verilirse birincil alan adı olur. */
  domain?: string
}

/** Kurulum sihirbazı 2. adım (§3.3): varsayılan kanal + birincil alan adı tek `atomic()`'te. EN, USD. */
export async function createDefaultChannel(
  p: Pick<Platform, "db" | "atomic">,
  input: DefaultChannelInput,
  now: number,
): Promise<void> {
  const currency = input.currency ?? "USD"
  const lang = input.lang ?? "en"
  const stmts = [
    insertChannelStatement(
      p.db,
      {
        publicId: input.publicId,
        code: input.code ?? "default",
        defaultCurrency: currency,
        currencies: [currency],
        defaultLang: lang,
        langs: [lang],
        timezone: input.timezone ?? "UTC",
        isDefault: true,
      },
      now,
    ),
  ]
  if (input.domain) {
    stmts.push(
      insertChannelDomainStatement(
        p.db,
        { channelId: channelIdByPublicId(input.publicId), domain: input.domain, isPrimary: true },
        now,
      ),
    )
  }
  await p.atomic(stmts)
}
