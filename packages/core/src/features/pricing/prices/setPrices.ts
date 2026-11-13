import { priceLists, prices } from "@openmers/db"
import { and, type SQL, sql } from "drizzle-orm"
import { type AtomicStatement, affected, guardedInsertStatement } from "../../../platform"
import { auditStatement } from "../../audit"
import { reindexForVariantStatement } from "../../catalog/products/reindexForVariant"
import { variantExistsGuard, variantIdByPublicId } from "../../catalog/products/statements"
import { auditActorOf } from "../../catalog/products/types"
import { findPriceList, priceListGuard, priceListIdByPublicId } from "../priceLists/statements"
import { isMoney, type PricingCtx, PricingError } from "../types"

/** Tek istekte en çok kayıt (sözleşmedeki `BULK_MAX_RECORDS` ile aynı). */
export const SET_PRICES_MAX = 500

export type SetPriceItem = {
  variantPublicId: string
  /** Miktar kademesi; varsayılan 1. */
  minQty?: number
  /** Küçük birim tamsayı; para birimi listeden yazılır (istemciden alınmaz). */
  amount: number
  compareAtAmount?: number | null
}

export type SetPriceResult =
  | { ok: true; index: number; value: { variantPublicId: string; minQty: number } }
  | { ok: false; index: number; code: "INVALID_INPUT" | "NOT_FOUND"; message: string }

function invalidReason(item: SetPriceItem, minQty: number): string | undefined {
  if (!Number.isSafeInteger(minQty) || minQty < 1) return "min_qty en az 1 tamsayı olmalı"
  if (!isMoney(item.amount)) return "tutar negatif olmayan tamsayı (küçük birim) olmalı"
  if (item.compareAtAmount != null && !isMoney(item.compareAtAmount)) {
    return "üstü çizili tutar negatif olmayan tamsayı olmalı"
  }
  return undefined
}

/**
 * `prices.setMany` (03-fiyat §7): liste + varyant + kademe → tutar upsert'i, tek `atomic()`.
 * İdempotent (aynı yük iki kez = aynı satırlar). Kayıt başına sonuç: geçersiz kayıt yazılmaz
 * (`INVALID_INPUT`), olmayan varyant 0 satır döner (`NOT_FOUND`), diğerleri yazılır.
 * Liste kanalın varsayılan listesiyse her varyantın ürünü için `reindex` işi aynı batch'tedir;
 * yazımdan sonra `pl:<public_id>` etiketi temizlenir (03-fiyat §5).
 */
export async function setPrices(
  ctx: PricingCtx,
  input: { priceListPublicId: string; items: readonly SetPriceItem[] },
): Promise<SetPriceResult[]> {
  const { items } = input
  if (items.length === 0 || items.length > SET_PRICES_MAX) {
    throw new PricingError("INVALID_INPUT", `kayıt sayısı 1..${SET_PRICES_MAX} olmalı`)
  }
  const p = ctx.platform
  const channelId = ctx.channel.id
  const listId = priceListIdByPublicId(input.priceListPublicId, channelId)
  const listGuard = priceListGuard(input.priceListPublicId, channelId)
  const isDefault = sql`EXISTS (SELECT 1 FROM "channels" WHERE "default_price_list_id" = ${listId})`

  const results: SetPriceResult[] = new Array(items.length)
  const written: { index: number; stmt: number }[] = []
  const stmts: AtomicStatement[] = []
  const seen = new Set<string>()
  items.forEach((item, index) => {
    const minQty = item.minQty ?? 1
    const reason = invalidReason(item, minQty)
    const key = `${item.variantPublicId}\u0000${minQty}`
    if (reason || seen.has(key)) {
      const message = reason ?? "aynı varyant ve kademe yükte yineleniyor"
      results[index] = { ok: false, index, code: "INVALID_INPUT", message }
      return
    }
    seen.add(key)
    const variantId = variantIdByPublicId(item.variantPublicId)
    const guard = and(listGuard, variantExistsGuard(item.variantPublicId)) as SQL
    const upsert = guardedInsertStatement(
      prices,
      {
        priceListId: listId,
        variantId,
        minQty,
        amount: item.amount,
        compareAtAmount: item.compareAtAmount ?? null,
        currency: sql`SELECT ${priceLists.currency} FROM ${priceLists} WHERE ${priceLists.id} = ${listId}`,
        createdAt: ctx.now,
        updatedAt: ctx.now,
      },
      guard,
    )
    written.push({ index, stmt: stmts.length })
    stmts.push({
      ...upsert,
      sql: `${upsert.sql} on conflict ("price_list_id", "variant_id", "min_qty") do update set
        "amount" = excluded."amount", "compare_at_amount" = excluded."compare_at_amount",
        "updated_at" = excluded."updated_at"`,
    })
    stmts.push(
      reindexForVariantStatement(variantId, ctx.now, and(guard, isDefault) as SQL, ctx.requestId),
    )
  })
  if (written.length === 0) return results

  stmts.push(
    auditStatement(
      p.db,
      {
        actor: auditActorOf(ctx),
        action: "prices:write",
        entityType: "price_list",
        entityPublicId: input.priceListPublicId,
        channelId,
        after: { publicId: input.priceListPublicId, items: written.length },
        requestId: ctx.requestId,
      },
      ctx.now,
      listGuard,
    ),
  )
  const result = await p.atomic(stmts)
  // Denetim satırı yalnız liste varsa yazılır: yoksa bütün kayıtlar 0 satır, liste `NOT_FOUND`.
  if (!affected(result, stmts.length - 1))
    await findPriceList(p.db, input.priceListPublicId, channelId)

  for (const { index, stmt } of written) {
    const item = items[index] as SetPriceItem
    const minQty = item.minQty ?? 1
    results[index] = affected(result, stmt)
      ? { ok: true, index, value: { variantPublicId: item.variantPublicId, minQty } }
      : { ok: false, index, code: "NOT_FOUND", message: "varyant bulunamadı" }
  }
  await p.purge([`pl:${input.priceListPublicId}`])
  return results
}
