import type { CatalogCard } from "../queries/shared"

// 15.12 (02-katalog §5): an external search engine built-in app consumes the same `reindex` events.
// Type only; lists and the product page still read the local read model.

export type SearchProvider = {
  /** Provider id, e.g. the built-in app code. */
  id: string
  /** Rewrite one product's documents (all channels and languages); a missing product removes them. */
  indexProduct(productPublicId: string): Promise<void>
  removeProduct(productPublicId: string): Promise<void>
  search(input: {
    channel: string
    lang: string
    q: string
    cursor?: string
    limit?: number
  }): Promise<{ items: CatalogCard[]; nextCursor: string | null }>
}
