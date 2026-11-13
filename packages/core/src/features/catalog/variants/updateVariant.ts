import { productVariants } from "@openmers/db"
import { and, eq, isNull, sql } from "drizzle-orm"
import { type AtomicStatement, affected } from "../../../platform"
import { auditStatement } from "../../audit"
import { enqueueStatement } from "../../outbox"
import {
  classifyVariantMiss,
  mapWriteError,
  reindexJob,
  taxCategoryIdByCode,
  variantOfProductGuard,
} from "../products/statements"
import {
  auditActorOf,
  type CatalogCtx,
  type UpdateVariantInput,
  type VariantPatch,
} from "../products/types"

/** Defined fields; `optionValues` does not change (combination rows are delete+insert, out of scope for this endpoint). */
function variantPatch(input: VariantPatch): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  if (input.sku !== undefined) patch.sku = input.sku.trim()
  if (input.barcode !== undefined) patch.barcode = input.barcode
  if (input.weight !== undefined) patch.weight = input.weight
  if (input.length !== undefined) patch.length = input.length
  if (input.width !== undefined) patch.width = input.width
  if (input.height !== undefined) patch.height = input.height
  if (input.trackInventory !== undefined) patch.trackInventory = input.trackInventory
  if (input.allowBackorder !== undefined) patch.allowBackorder = input.allowBackorder
  if (input.backorderFloor !== undefined) patch.backorderFloor = input.backorderFloor
  if (input.minOrderQty !== undefined) patch.minOrderQty = input.minOrderQty
  if (input.orderMultiple !== undefined) patch.orderMultiple = input.orderMultiple
  if (input.fulfillmentType !== undefined) patch.fulfillmentType = input.fulfillmentType
  if (input.leadTimeDays !== undefined) patch.leadTimeDays = input.leadTimeDays
  if (input.taxCategoryCode !== undefined) {
    patch.taxCategoryId = taxCategoryIdByCode(input.taxCategoryCode)
  }
  return patch
}

/**
 * Variant update: a single `version`-conditional `atomic()`; the variant must be under the product.
 * Audit/outbox are conditional writes bound to the **old version**, the version-bumping `UPDATE` is the last statement
 * (see `updateProduct`): on conflict no row is written and `CONFLICT` is returned.
 */
export async function updateVariant(
  ctx: CatalogCtx,
  input: UpdateVariantInput,
): Promise<{ publicId: string; version: number }> {
  const p = ctx.platform
  const next = input.version + 1
  const guard = variantOfProductGuard(input.productPublicId, input.publicId, input.version)
  const patch = variantPatch(input.patch)

  const stmts: AtomicStatement[] = [
    auditStatement(
      p.db,
      {
        actor: auditActorOf(ctx),
        action: "products:write",
        entityType: "product_variant",
        entityPublicId: input.publicId,
        channelId: ctx.channel.id,
        after: { publicId: input.publicId, version: next, fields: Object.keys(patch) },
        requestId: ctx.requestId,
      },
      ctx.now,
      guard,
    ),
    enqueueStatement(p.db, reindexJob(input.productPublicId, ctx.requestId), ctx.now, guard),
    p.db
      .update(productVariants)
      .set({
        ...patch,
        version: sql`${productVariants.version} + 1`,
        updatedAt: ctx.now,
      } as unknown as Partial<typeof productVariants.$inferInsert>)
      .where(
        and(
          eq(productVariants.publicId, input.publicId),
          eq(productVariants.version, input.version),
          isNull(productVariants.deletedAt),
        ),
      )
      .toSQL(),
  ]

  try {
    const result = await p.atomic(stmts)
    if (!affected(result, stmts.length - 1)) await classifyVariantMiss(p.db, input.publicId)
  } catch (error) {
    mapWriteError(error)
  }
  return { publicId: input.publicId, version: next }
}
