import { productVariants, variantOptionValues } from "@openmers/db"
import { type AtomicStatement, affected, guardedInsertStatement } from "../../../platform"
import { auditStatement } from "../../audit"
import { newPublicId, PUBLIC_ID_PREFIXES } from "../../ids"
import { enqueueStatement } from "../../outbox"
import { assertHasVariant } from "../products/assertHasVariant"
import {
  assertUniqueOptionValues,
  mapWriteError,
  optionIdByCode,
  optionValueIdByCode,
  productExistsGuard,
  productIdByPublicId,
  reindexJob,
  taxCategoryIdByCode,
  variantChannelStatements,
  variantExistsGuard,
  variantIdByPublicId,
} from "../products/statements"
import {
  type AddVariantInput,
  auditActorOf,
  type CatalogCtx,
  CatalogError,
} from "../products/types"

/**
 * Adds a variant to an existing product: variant + `variant_option_values` + channel assignments + audit +
 * `reindex` job in one `atomic()`. If the product is missing, no statement writes (`NOT_FOUND`). Option values
 * must belong to the product's options; the composite FK is the last gate.
 *
 * Note: **combination uniqueness** against existing variants needs a read, so it is not validated here;
 * only duplicates within the payload are rejected (deviation: `createProduct` validates fully).
 */
export async function addVariant(
  ctx: CatalogCtx,
  input: AddVariantInput,
): Promise<{ publicId: string; version: number }> {
  const p = ctx.platform
  const { variant } = input
  assertHasVariant([variant])
  assertUniqueOptionValues(variant.optionValues)
  const publicId = newPublicId(PUBLIC_ID_PREFIXES.product_variants)
  const exists = productExistsGuard(input.productPublicId)
  const variantGuard = variantExistsGuard(publicId)

  const stmts: AtomicStatement[] = [
    guardedInsertStatement(
      productVariants,
      {
        publicId,
        productId: productIdByPublicId(input.productPublicId),
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
      },
      exists,
    ),
  ]
  const variantId = variantIdByPublicId(publicId)
  for (const entry of variant.optionValues ?? []) {
    stmts.push(
      guardedInsertStatement(
        variantOptionValues,
        {
          variantId,
          optionId: optionIdByCode(input.productPublicId, entry.option),
          optionValueId: optionValueIdByCode(input.productPublicId, entry.option, entry.value),
          createdAt: ctx.now,
        },
        variantGuard,
      ),
    )
  }
  stmts.push(...variantChannelStatements(publicId, ctx.channel.id, ctx.now, variantGuard))
  stmts.push(
    auditStatement(
      p.db,
      {
        actor: auditActorOf(ctx),
        action: "products:write",
        entityType: "product_variant",
        entityPublicId: publicId,
        channelId: ctx.channel.id,
        after: { publicId, product: input.productPublicId, sku: variant.sku },
        requestId: ctx.requestId,
      },
      ctx.now,
      variantGuard,
    ),
    enqueueStatement(p.db, reindexJob(input.productPublicId, ctx.requestId), ctx.now, variantGuard),
  )

  try {
    const result = await p.atomic(stmts)
    if (!affected(result, 0)) {
      throw new CatalogError("NOT_FOUND", "ürün bulunamadı")
    }
  } catch (error) {
    mapWriteError(error)
  }
  return { publicId, version: 0 }
}
