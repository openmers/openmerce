import {
  optionValues,
  optionValueTranslations,
  productOptions,
  productOptionTranslations,
  products,
  productTranslations,
  productVariants,
  variantOptionValues,
} from "@openmers/db"
import type { AtomicStatement } from "../../../platform"
import { auditStatement } from "../../audit"
import { insertWithPublicId, newPublicId, PUBLIC_ID_PREFIXES } from "../../ids"
import { enqueueStatement } from "../../outbox"
import { assertHasVariant } from "./assertHasVariant"
import { assertOptionCombinations } from "./assertOptionCombinations"
import {
  assertUniqueLangs,
  assertUniqueOptionValues,
  mapWriteError,
  optionIdByCode,
  optionValueIdByCode,
  productChannelStatements,
  productIdByPublicId,
  reindexJob,
  taxCategoryIdByCode,
  variantChannelStatements,
  variantIdByPublicId,
} from "./statements"
import { auditActorOf, type CatalogCtx, type CreateProductInput } from "./types"

/**
 * Yeni ürün: tek `atomic()` içinde ürün + çeviriler + seçenekler + seçenek değerleri + varyantlar +
 * `variant_option_values` + kanal atamaları + denetim + `reindex` işi (02-katalog §1, §3). Fiyat ve
 * stok yazılmaz: varyant fiyatsız/stoksuz doğar (madde 16/17).
 *
 * Yeni satırların `id`'si alt sorguyla çözülür (`public_id`/kod); interaktif transaction yok.
 */
export async function createProduct(
  ctx: CatalogCtx,
  input: CreateProductInput,
): Promise<{ publicId: string; version: number }> {
  const p = ctx.platform
  assertHasVariant(input.variants)
  assertUniqueLangs(input.translations)
  const options = input.options ?? []
  assertOptionCombinations(options, input.variants)
  for (const variant of input.variants) assertUniqueOptionValues(variant.optionValues)

  const build = (productPublicId: string): AtomicStatement[] => {
    const variantIds = input.variants.map(() => newPublicId(PUBLIC_ID_PREFIXES.product_variants))
    const productId = productIdByPublicId(productPublicId)
    const stmts: AtomicStatement[] = [
      p.db
        .insert(products)
        .values({
          publicId: productPublicId,
          robots: input.robots ?? null,
          personalization: input.personalization ?? null,
          withdrawalExemptKind: input.withdrawalExemptKind ?? null,
          customFields: input.customFields ?? null,
          metadata: input.metadata ?? null,
          privateMetadata: input.privateMetadata ?? null,
          version: 0,
          createdAt: ctx.now,
          updatedAt: ctx.now,
        })
        .toSQL(),
    ]
    for (const translation of input.translations) {
      stmts.push(
        p.db
          .insert(productTranslations)
          .values({
            productId: productId,
            lang: translation.lang,
            name: translation.name,
            slug: translation.slug,
            description: translation.description ?? null,
            seoTitle: translation.seoTitle ?? null,
            seoDescription: translation.seoDescription ?? null,
            createdAt: ctx.now,
            updatedAt: ctx.now,
          })
          .toSQL(),
      )
    }
    options.forEach((option, oi) => {
      stmts.push(
        p.db
          .insert(productOptions)
          .values({
            productId: productId,
            code: option.code,
            position: option.position ?? oi,
            createdAt: ctx.now,
            updatedAt: ctx.now,
          })
          .toSQL(),
      )
      const optionId = optionIdByCode(productPublicId, option.code)
      for (const translation of input.translations) {
        stmts.push(
          p.db
            .insert(productOptionTranslations)
            .values({
              optionId: optionId,
              lang: translation.lang,
              name: option.name,
              createdAt: ctx.now,
              updatedAt: ctx.now,
            })
            .toSQL(),
        )
      }
      option.values.forEach((value, vi) => {
        stmts.push(
          p.db
            .insert(optionValues)
            .values({
              optionId: optionId,
              code: value.code,
              position: value.position ?? vi,
              createdAt: ctx.now,
              updatedAt: ctx.now,
            })
            .toSQL(),
        )
        const valueId = optionValueIdByCode(productPublicId, option.code, value.code)
        for (const translation of input.translations) {
          stmts.push(
            p.db
              .insert(optionValueTranslations)
              .values({
                optionValueId: valueId,
                lang: translation.lang,
                name: value.name,
                createdAt: ctx.now,
                updatedAt: ctx.now,
              })
              .toSQL(),
          )
        }
      })
    })

    input.variants.forEach((variant, vi) => {
      const variantPublicId = variantIds[vi] as string
      stmts.push(
        p.db
          .insert(productVariants)
          .values({
            publicId: variantPublicId,
            productId: productId,
            sku: variant.sku.trim(),
            taxCategoryId: taxCategoryIdByCode(variant.taxCategoryCode),
            barcode: variant.barcode ?? null,
            weight: variant.weight ?? null,
            length: variant.length ?? null,
            width: variant.width ?? null,
            height: variant.height ?? null,
            trackInventory: variant.trackInventory ?? true,
            allowBackorder: variant.allowBackorder ?? false,
            backorderFloor: variant.backorderFloor ?? null,
            minOrderQty: variant.minOrderQty ?? null,
            orderMultiple: variant.orderMultiple ?? null,
            fulfillmentType: variant.fulfillmentType ?? "physical",
            leadTimeDays: variant.leadTimeDays ?? null,
            createdAt: ctx.now,
            updatedAt: ctx.now,
          })
          .toSQL(),
      )
      const variantId = variantIdByPublicId(variantPublicId)
      for (const entry of variant.optionValues ?? []) {
        stmts.push(
          p.db
            .insert(variantOptionValues)
            .values({
              variantId: variantId,
              optionId: optionIdByCode(productPublicId, entry.option),
              optionValueId: optionValueIdByCode(productPublicId, entry.option, entry.value),
              createdAt: ctx.now,
            })
            .toSQL(),
        )
      }
      stmts.push(...variantChannelStatements(variantPublicId, ctx.channel.id, ctx.now))
    })

    stmts.push(...productChannelStatements(productPublicId, ctx.channel.id, ctx.now))
    stmts.push(
      auditStatement(
        p.db,
        {
          actor: auditActorOf(ctx),
          action: "products:write",
          entityType: "product",
          entityPublicId: productPublicId,
          channelId: ctx.channel.id,
          after: {
            publicId: productPublicId,
            variants: variantIds,
            langs: input.translations.map((t) => t.lang),
          },
          requestId: ctx.requestId,
        },
        ctx.now,
      ),
    )
    stmts.push(enqueueStatement(p.db, reindexJob(productPublicId, ctx.requestId), ctx.now))
    return stmts
  }

  try {
    if (input.publicId) {
      await p.atomic(build(input.publicId))
      return { publicId: input.publicId, version: 0 }
    }
    const publicId = await insertWithPublicId(p, build, { prefix: PUBLIC_ID_PREFIXES.products })
    return { publicId, version: 0 }
  } catch (error) {
    mapWriteError(error)
  }
}
