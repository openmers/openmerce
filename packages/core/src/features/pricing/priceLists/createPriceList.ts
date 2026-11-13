import { priceLists } from "@openmers/db"
import { auditStatement } from "../../audit"
import { auditActorOf } from "../../catalog/products/types"
import { insertWithPublicId, PUBLIC_ID_PREFIXES } from "../../ids"
import {
  assertCurrency,
  assertWindow,
  mapPricingWriteError,
  PRICE_LIST_TYPES,
  type PriceListType,
  type PricingCtx,
  PricingError,
} from "../types"

export type CreatePriceListInput = {
  name: string
  /** Oluşturulduktan sonra değişmez (`prices.currency` bununla aynı kalır). */
  currency: string
  type: PriceListType
  priority?: number
  startsAt?: number | null
  endsAt?: number | null
  includesTax: boolean
}

/**
 * `ctx.channel` için fiyat listesi + denetim tek `atomic()`. Kanal × para birimi başına tek `base`
 * (kısmi benzersiz indeks son kapıdır): ikinci `base` `CONFLICT`.
 */
export async function createPriceList(
  ctx: PricingCtx,
  input: CreatePriceListInput,
): Promise<{ publicId: string }> {
  const name = input.name.trim()
  if (name.length === 0) throw new PricingError("INVALID_INPUT", "liste adı boş olamaz")
  if (!PRICE_LIST_TYPES.includes(input.type)) {
    throw new PricingError("INVALID_INPUT", `geçersiz liste türü: ${input.type}`)
  }
  const priority = input.priority ?? 0
  if (!Number.isSafeInteger(priority)) throw new PricingError("INVALID_INPUT", "geçersiz öncelik")
  assertCurrency(input.currency)
  assertWindow(input.startsAt, input.endsAt)

  const p = ctx.platform
  try {
    const publicId = await insertWithPublicId(
      p,
      (publicId) => [
        p.db
          .insert(priceLists)
          .values({
            publicId,
            name,
            channelId: ctx.channel.id,
            currency: input.currency,
            type: input.type,
            priority,
            startsAt: input.startsAt ?? null,
            endsAt: input.endsAt ?? null,
            includesTax: input.includesTax,
            createdAt: ctx.now,
            updatedAt: ctx.now,
          })
          .toSQL(),
        auditStatement(
          p.db,
          {
            actor: auditActorOf(ctx),
            action: "prices:write",
            entityType: "price_list",
            entityPublicId: publicId,
            channelId: ctx.channel.id,
            after: { publicId, name, currency: input.currency, type: input.type, priority },
            requestId: ctx.requestId,
          },
          ctx.now,
        ),
      ],
      { prefix: PUBLIC_ID_PREFIXES.price_lists },
    )
    return { publicId }
  } catch (error) {
    mapPricingWriteError(error)
  }
}
