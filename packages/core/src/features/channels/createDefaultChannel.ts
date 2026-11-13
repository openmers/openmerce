import { PUBLIC_ID_PREFIXES } from "@openmers/db"
import type { Platform } from "../../platform"
import { insertWithPublicId } from "../ids"
import { channelIdByPublicId, insertChannelStatement } from "./queries/insertChannel"
import { insertChannelDomainStatement } from "./queries/insertChannelDomain"

export type DefaultChannelInput = {
  /** If not given, an id with the `chn_` prefix is generated (item 6.6). */
  publicId?: string
  code?: string
  currency?: string
  lang?: string
  timezone?: string
  /** If given, becomes the primary domain. */
  domain?: string
}

/** Setup wizard step 2 (§3.3): default channel + primary domain in one `atomic()`. EN, USD. */
export async function createDefaultChannel(
  p: Pick<Platform, "db" | "atomic">,
  input: DefaultChannelInput,
  now: number,
): Promise<string> {
  const currency = input.currency ?? "USD"
  const lang = input.lang ?? "en"

  const build = (publicId: string) => {
    const stmts = [
      insertChannelStatement(
        p.db,
        {
          publicId,
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
          { channelId: channelIdByPublicId(publicId), domain: input.domain, isPrimary: true },
          now,
        ),
      )
    }
    return stmts
  }

  if (input.publicId) {
    await p.atomic(build(input.publicId))
    return input.publicId
  }
  return insertWithPublicId(p, build, { prefix: PUBLIC_ID_PREFIXES.channels })
}
