import { products, productVariants } from "@openmers/db"
import { and, eq, isNull, sql } from "drizzle-orm"
import { type AtomicStatement, affected } from "../../../platform"
import { auditStatement } from "../../audit"
import { enqueueStatement } from "../../outbox"
import { mapWriteError, reindexJob, variantOfProductGuard } from "../products/statements"
import { auditActorOf, type CatalogCtx, CatalogError } from "../products/types"

/** Son varyant silinemez: ürünün en az bir varyantı kalır (02-katalog §1). */
const NOT_LAST_VARIANT = sql`(SELECT count(*) FROM "product_variants" pv
  WHERE pv."product_id" = "product_variants"."product_id" AND pv."deleted_at" IS NULL) > 1`

/**
 * Varyantı yumuşak siler (`deleted_at`; SKU yeniden kullanılabilir). Koşullu tek `atomic()`:
 * sürüm tutmalı, varyant ürünün altında olmalı ve **son varyant olmamalı**. Silinemeyen durumda
 * hiçbir satır yazılmaz; sonra `NOT_FOUND` / `CONFLICT` / `INVALID_INPUT` olarak sınıflandırılır.
 */
export async function removeVariant(
  ctx: CatalogCtx,
  input: { publicId: string; productPublicId: string; version: number },
): Promise<{ publicId: string }> {
  const p = ctx.platform
  const next = input.version + 1
  const productId = sql`(SELECT ${products.id} FROM ${products} WHERE ${products.publicId} = ${input.productPublicId})`
  const guard = variantOfProductGuard(input.productPublicId, input.publicId, input.version)

  // Koşullu satırlar eski sürüme bağlı; sürümü artıran `UPDATE` son ifade (bkz. `updateProduct`).
  const stmts: AtomicStatement[] = [
    auditStatement(
      p.db,
      {
        actor: auditActorOf(ctx),
        action: "products:delete",
        entityType: "product_variant",
        entityPublicId: input.publicId,
        channelId: ctx.channel.id,
        after: { publicId: input.publicId, version: next, deletedAt: ctx.now },
        requestId: ctx.requestId,
      },
      ctx.now,
      guard,
    ),
    enqueueStatement(p.db, reindexJob(input.productPublicId, ctx.requestId), ctx.now, guard),
    p.db
      .update(productVariants)
      .set({ deletedAt: ctx.now, version: sql`${productVariants.version} + 1`, updatedAt: ctx.now })
      .where(
        and(
          eq(productVariants.publicId, input.publicId),
          eq(productVariants.version, input.version),
          isNull(productVariants.deletedAt),
          eq(productVariants.productId, productId),
          NOT_LAST_VARIANT,
        ),
      )
      .toSQL(),
  ]

  try {
    const result = await p.atomic(stmts)
    if (!affected(result, stmts.length - 1)) {
      const row = (
        await p.db
          .select({ version: productVariants.version, deletedAt: productVariants.deletedAt })
          .from(productVariants)
          .where(eq(productVariants.publicId, input.publicId))
          .limit(1)
      )[0]
      if (!row || row.deletedAt !== null) throw new CatalogError("NOT_FOUND", "varyant bulunamadı")
      if (row.version !== input.version) {
        throw new CatalogError("CONFLICT", "sürüm çakışması: varyant başka bir yazımla değişti")
      }
      throw new CatalogError("INVALID_INPUT", "son varyant silinemez")
    }
  } catch (error) {
    mapWriteError(error)
  }
  return { publicId: input.publicId }
}
