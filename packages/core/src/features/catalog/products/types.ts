import type { Ctx } from "../../../ctx"
import type { AuditActor } from "../../audit"

/** Expected catalog errors are returned as typed errors carrying a `code`, not as values. */
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
 * Options and option values belong to the product (`product_options.product_id`). `name` is written the same
 * for all product languages: no separate translation input for option names in v1 (deviation).
 */
export type ProductOptionInput = {
  code: string
  name: string
  position?: number
  values: Array<{ code: string; name: string; position?: number }>
}

/** The sold unit; price and stock are out of scope for these endpoints (the variant is born without price/stock). */
export type ProductVariantInput = {
  sku: string
  /** `tax_categories.code`; the internal id is never exposed, the code is resolved via a subquery. */
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
  /** Option **codes**; the combination must be complete and not repeated (02-katalog §1). */
  optionValues?: Array<{ option: string; value: string }>
}

/** Write fields; `patch` semantics for translations and variants (fields not given stay unchanged). */
export type ProductPatch = {
  robots?: string | null
  personalization?: Record<string, unknown> | null
  withdrawalExemptKind?: string | null
  customFields?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
  privateMetadata?: Record<string, unknown> | null
}

export type CreateProductInput = ProductPatch & {
  /** If not given, an id with the `prod_` prefix is generated and retried on collision (item 6.6). */
  publicId?: string
  translations: ProductTranslationInput[]
  options?: ProductOptionInput[]
  variants: ProductVariantInput[]
}

export type UpdateProductInput = {
  publicId: string
  /** The version the client saw; a concurrent write returns a `CONFLICT`. */
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

/** The part of `Ctx` catalog writes need; the audit actor is derived from it. */
export type CatalogCtx = Pick<Ctx, "platform" | "channel" | "actor" | "now" | "requestId" | "lang">

/** `audit_log` actor types; anonymous/customer cannot write the catalog, recorded as system. */
export function auditActorOf(ctx: CatalogCtx): AuditActor {
  const { actor } = ctx
  if (actor.type === "admin" || actor.type === "app" || actor.type === "apiKey") {
    return { type: actor.type, id: actor.id }
  }
  return { type: "system" }
}
