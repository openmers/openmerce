import type { Ctx } from "../../../ctx"
import type { AuditActor } from "../../audit"

/** Beklenen katalog hataları değer olarak değil, `code` taşıyan tipli hata olarak döner. */
export type CatalogErrorCode = "INVALID_INPUT" | "NOT_FOUND" | "CONFLICT"

export class CatalogError extends Error {
  constructor(
    readonly code: CatalogErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "CatalogError"
  }
}

export type ProductTranslationInput = {
  lang: string
  name: string
  slug: string
  description?: string | null
  seoTitle?: string | null
  seoDescription?: string | null
}

/**
 * Seçenek ve seçenek değeri ürüne özeldir (`product_options.product_id`). `name` bütün ürün
 * dilleri için aynı yazılır: seçenek adı için ayrı çeviri girdisi v1'de alınmıyor (sapma).
 */
export type ProductOptionInput = {
  code: string
  name: string
  position?: number
  values: Array<{ code: string; name: string; position?: number }>
}

/** Satılan birim; fiyat ve stok bu uçların kapsamı dışında (varyant fiyatsız/stoksuz doğar). */
export type ProductVariantInput = {
  sku: string
  /** `tax_categories.code`; iç kimlik dışarıya çıkmaz, kod alt sorguyla çözülür. */
  taxCategoryCode: string
  barcode?: string | null
  weight?: number | null
  length?: number | null
  width?: number | null
  height?: number | null
  trackInventory?: boolean
  allowBackorder?: boolean
  backorderFloor?: number | null
  minOrderQty?: number | null
  orderMultiple?: number | null
  fulfillmentType?: "physical" | "digital"
  leadTimeDays?: number | null
  /** Seçenek **kodları**; kombinasyon tam olmalı ve tekrarlanmamalı (02-katalog §1). */
  optionValues?: Array<{ option: string; value: string }>
}

/** Yazma alanları; çeviri ve varyantlarda `patch` anlamı (verilmeyen alan değişmez). */
export type ProductPatch = {
  robots?: string | null
  personalization?: Record<string, unknown> | null
  withdrawalExemptKind?: string | null
  customFields?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
  privateMetadata?: Record<string, unknown> | null
}

export type CreateProductInput = ProductPatch & {
  /** Verilmezse `prod_` önekli kimlik üretilir ve çakışmada yeniden denenir (madde 6.6). */
  publicId?: string
  translations: ProductTranslationInput[]
  options?: ProductOptionInput[]
  variants: ProductVariantInput[]
}

export type UpdateProductInput = {
  publicId: string
  /** İstemcinin gördüğü sürüm; eşzamanlı yazmada çakışma `CONFLICT` döner. */
  version: number
  translations?: ProductTranslationInput[]
  patch: ProductPatch
}

export type VariantPatch = Partial<
  Omit<ProductVariantInput, "sku" | "taxCategoryCode" | "optionValues">
> & {
  sku?: string
  taxCategoryCode?: string
}

export type UpdateVariantInput = {
  publicId: string
  productPublicId: string
  version: number
  patch: VariantPatch
}

export type AddVariantInput = { productPublicId: string; variant: ProductVariantInput }

/** Katalog yazımlarının ihtiyaç duyduğu `Ctx` parçası; denetim aktörü buradan türetilir. */
export type CatalogCtx = Pick<Ctx, "platform" | "channel" | "actor" | "now" | "requestId" | "lang">

/** `audit_log` aktör türleri; anonim/müşteri katalog yazamaz, sistem olarak kaydedilir. */
export function auditActorOf(ctx: CatalogCtx): AuditActor {
  const { actor } = ctx
  if (actor.type === "admin" || actor.type === "app" || actor.type === "apiKey") {
    return { type: actor.type, id: actor.id }
  }
  return { type: "system" }
}
