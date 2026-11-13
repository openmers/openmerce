import type { StockBucket } from "../../stock"

// Write-model snapshot of one product, as the reindex loader reads it; the builders are pure over it.

/** Language → name; missing languages fall back to the code. */
export type Names = Readonly<Record<string, string>>

export type ImageRef = { key: string; width: number | null; height: number | null; sizes: number[] }

export type SourceTranslation = {
  lang: string
  /** `null` = all channels; set = that channel's override. */
  channelId: number | null
  name: string
  slug: string
  description: string | null
  seoTitle: string | null
  seoDescription: string | null
}

export type SourceVariant = {
  id: number
  publicId: string
  sku: string
  leadTimeDays: number | null
  trackInventory: boolean
  baseVariantId: number | null
  unitFactor: number
  /** Channels from `variant_channels`. */
  channelIds: number[]
  optionValueIds: number[]
  facetValueIds: number[]
  /** Computed `collection_variants` membership (not deleted collections). */
  collectionIds: number[]
}

export type SourceFacetValue = {
  id: number
  facetCode: string
  code: string
  /** Private facets never reach the read model. */
  private: boolean
  facetNames: Names
  names: Names
}

export type SourceOption = {
  id: number
  code: string
  position: number
  names: Names
  values: { id: number; code: string; position: number; names: Names }[]
}

/** `product_assets` row with its ready, public media; level = variant, option value or product. */
export type SourceAsset = {
  variantId: number | null
  optionValueId: number | null
  position: number
  image: ImageRef
}

export type SourceChannel = {
  id: number
  langs: string[]
  /** Currency of the channel's default price list (channel default currency without one). */
  currency: string
}

/** A tier of the channel's default price list. */
export type SourcePrice = { channelId: number; variantId: number; minQty: number; amount: number }

export type ProductSource = {
  id: number
  publicId: string
  createdAt: number
  personalization: Record<string, unknown> | null
  translations: SourceTranslation[]
  /** Not deleted variants only. */
  variants: SourceVariant[]
  productFacetValueIds: number[]
  facetValues: SourceFacetValue[]
  options: SourceOption[]
  assets: SourceAsset[]
  /** Channels the product is assigned to (`product_channels`). */
  channels: SourceChannel[]
  prices: SourcePrice[]
  /** Sellable (`on_hand − reserved − safety`, all warehouses) by variant id, bundle bases included. */
  available: Readonly<Record<number, number>>
  /** Collection id → channels it is visible in (`collection_channels`). */
  collectionChannels: Readonly<Record<number, number[]>>
}

export type FtsText = { name: string; sku: string; facetText: string; descriptionExcerpt: string }

export type IndexRow = {
  channelId: number
  lang: string
  variantId: number
  productId: number
  productPublicId: string
  slug: string
  name: string
  sku: string
  thumb: ImageRef | null
  collectionIds: number[]
  facetValueIds: number[]
  priceMin: number | null
  priceMax: number | null
  currency: string
  stockBucket: StockBucket
  leadTimeDays: number | null
  sortName: string
  createdAt: number
  salesRank: number | null
  groupFirst: boolean
  /** Only the `group_first` row carries an FTS row (product-level search). */
  fts: FtsText | null
}

export type MatchRow = { channelId: number; id: number; variantId: number }

export type ViewRow = {
  channelId: number
  lang: string
  slug: string
  productId: number
  data: Record<string, unknown>
}

export type BuiltIndex = {
  rows: IndexRow[]
  facets: MatchRow[]
  collections: MatchRow[]
  views: ViewRow[]
}
