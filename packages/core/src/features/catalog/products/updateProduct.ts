import { products, productTranslations } from "@openmers/db"
import { and, eq, inArray, isNull, sql } from "drizzle-orm"
import { type AtomicStatement, affected, guardedInsertStatement } from "../../../platform"
import { auditStatement } from "../../audit"
import { enqueueStatement } from "../../outbox"
import {
  assertUniqueLangs,
  classifyProductMiss,
  mapWriteError,
  productIdByPublicId,
  productVersionGuard,
  reindexJob,
} from "./statements"
import { auditActorOf, type CatalogCtx, type UpdateProductInput } from "./types"

const PATCH_FIELDS = [
  "robots",
  "personalization",
  "withdrawalExemptKind",
  "customFields",
  "metadata",
  "privateMetadata",
] as const

/** Tanımlı alanlar; verilmeyen alan `UPDATE`a girmez (patch anlamı). */
function productPatch(input: UpdateProductInput["patch"]): Partial<typeof products.$inferInsert> {
  const patch: Partial<typeof products.$inferInsert> = {}
  const target = patch as Record<string, unknown>
  for (const field of PATCH_FIELDS) {
    const value = input[field]
    if (value !== undefined) target[field] = value
  }
  return patch
}

/**
 * Ürün güncellemesi: `version` koşullu tek `atomic()` (02-veritabanı, ortak kural 7).
 *
 * Sıra önemlidir: çeviri/denetim/outbox yazımları **eski sürüme** bağlı koşulludur, sürümü artıran
 * `UPDATE` ise **son** ifadedir. Aynı transaction içinde eski sürüm değişmediği için koşullar ya
 * hep tutar ya hiç tutmaz; yarışı kaybeden çağrı hiçbir satır yazmaz ve `CONFLICT` alır. (Sürümü
 * önce artırmak, kaybedenin `version + 1` koşulunu kazananın yeni sürümüyle eşleştirirdi.)
 */
export async function updateProduct(
  ctx: CatalogCtx,
  input: UpdateProductInput,
): Promise<{ publicId: string; version: number }> {
  const p = ctx.platform
  if (input.translations) assertUniqueLangs(input.translations)
  const next = input.version + 1
  const guard = productVersionGuard(input.publicId, input.version)
  const patch = productPatch(input.patch)

  const stmts: AtomicStatement[] = []
  if (input.translations) {
    const productIds = p.db
      .select({ id: products.id })
      .from(products)
      .where(productVersionGuard(input.publicId, input.version))
    stmts.push(
      p.db
        .delete(productTranslations)
        .where(inArray(productTranslations.productId, productIds))
        .toSQL(),
    )
    for (const translation of input.translations) {
      stmts.push(
        guardedInsertStatement(
          productTranslations,
          {
            productId: productIdByPublicId(input.publicId),
            lang: translation.lang,
            name: translation.name,
            slug: translation.slug,
            description: translation.description ?? null,
            seoTitle: translation.seoTitle ?? null,
            seoDescription: translation.seoDescription ?? null,
            createdAt: ctx.now,
            updatedAt: ctx.now,
          },
          guard,
        ),
      )
    }
  }

  stmts.push(
    auditStatement(
      p.db,
      {
        actor: auditActorOf(ctx),
        action: "products:write",
        entityType: "product",
        entityPublicId: input.publicId,
        channelId: ctx.channel.id,
        after: { publicId: input.publicId, version: next, fields: Object.keys(patch) },
        requestId: ctx.requestId,
      },
      ctx.now,
      guard,
    ),
    enqueueStatement(p.db, reindexJob(input.publicId, ctx.requestId), ctx.now, guard),
    p.db
      .update(products)
      .set({ ...patch, version: sql`${products.version} + 1`, updatedAt: ctx.now })
      .where(
        and(
          eq(products.publicId, input.publicId),
          eq(products.version, input.version),
          isNull(products.deletedAt),
        ),
      )
      .toSQL(),
  )

  try {
    const result = await p.atomic(stmts)
    if (!affected(result, stmts.length - 1)) await classifyProductMiss(p.db, input.publicId)
  } catch (error) {
    mapWriteError(error)
  }
  return { publicId: input.publicId, version: next }
}
