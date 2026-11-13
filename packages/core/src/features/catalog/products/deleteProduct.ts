import { products, productVariants } from "@openmers/db"
import { and, eq, isNull, sql } from "drizzle-orm"
import { type AtomicStatement, affected } from "../../../platform"
import { auditStatement } from "../../audit"
import { enqueueStatement } from "../../outbox"
import { classifyProductMiss, mapWriteError, productVersionGuard, reindexJob } from "./statements"
import { auditActorOf, type CatalogCtx } from "./types"

/**
 * Ürünü **yumuşak** siler (02-veritabanı `products.deleted_at`): ürün ve bütün varyantları
 * `deleted_at` alır, sürüm artar; silinen varyantın SKU'su yeniden kullanılabilir (kısmi indeks).
 * Vitrin 301/410 kararını ayardan verir (14-seo). İndeks `reindex` işiyle temizlenir.
 *
 * Koşullu ifadeler **eski sürüme** bağlıdır; sürümü artıran `UPDATE` son ifadedir (bkz.
 * `updateProduct`): kaybeden çağrı hiçbir satır yazmaz.
 */
export async function deleteProduct(
  ctx: CatalogCtx,
  input: { publicId: string; version: number },
): Promise<{ publicId: string; version: number }> {
  const p = ctx.platform
  const next = input.version + 1
  const guard = productVersionGuard(input.publicId, input.version)
  const productIds = p.db
    .select({ id: products.id })
    .from(products)
    .where(productVersionGuard(input.publicId, input.version))

  const stmts: AtomicStatement[] = [
    p.db
      .update(productVariants)
      .set({ deletedAt: ctx.now, version: sql`${productVariants.version} + 1`, updatedAt: ctx.now })
      .where(
        and(
          sql`${productVariants.productId} IN (${productIds})`,
          isNull(productVariants.deletedAt),
        ),
      )
      .toSQL(),
    auditStatement(
      p.db,
      {
        actor: auditActorOf(ctx),
        action: "products:delete",
        entityType: "product",
        entityPublicId: input.publicId,
        channelId: ctx.channel.id,
        after: { publicId: input.publicId, version: next, deletedAt: ctx.now },
        requestId: ctx.requestId,
      },
      ctx.now,
      guard,
    ),
    enqueueStatement(p.db, reindexJob(input.publicId, ctx.requestId), ctx.now, guard),
    p.db
      .update(products)
      .set({ deletedAt: ctx.now, version: sql`${products.version} + 1`, updatedAt: ctx.now })
      .where(
        and(
          eq(products.publicId, input.publicId),
          eq(products.version, input.version),
          isNull(products.deletedAt),
        ),
      )
      .toSQL(),
  ]

  try {
    const result = await p.atomic(stmts)
    if (!affected(result, stmts.length - 1)) await classifyProductMiss(p.db, input.publicId)
  } catch (error) {
    mapWriteError(error)
  }
  return { publicId: input.publicId, version: next }
}
