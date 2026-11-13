import { oc } from "@orpc/contract"
import { z } from "zod"

// Storefront catalog (02-katalog §4): reads only the read model (`catalog_index`, `product_view`).
// Public, no internal id; cursors are opaque strings.

const image = z.object({
  key: z.string(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  sizes: z.array(z.number().int()),
})

export const shopCatalogCard = z.object({
  product: z.string(),
  slug: z.string(),
  name: z.string(),
  sku: z.string(),
  thumb: image.nullable(),
  priceMin: z.number().int().nullable(),
  priceMax: z.number().int().nullable(),
  currency: z.string(),
  stockBucket: z.enum(["out", "low", "in_stock"]),
  leadTimeDays: z.number().int().nullable(),
})

export const shopCatalogPage = z.object({
  items: z.array(shopCatalogCard),
  nextCursor: z.string().nullable(),
})

const cursor = z.string().max(512).optional()
const limit = z.number().int().min(1).max(100).optional()
const filters = {
  /** Collection public id. */
  collection: z.string().max(64).optional(),
  /** `facetCode:valueCode`, all required. */
  facets: z.array(z.string().max(129)).max(10).optional(),
}

export const shopCatalog = {
  list: oc
    .input(
      z.object({
        ...filters,
        sort: z.enum(["default", "name", "newest", "price"]).optional(),
        cursor,
        limit,
      }),
    )
    .output(shopCatalogPage),
  facets: oc.input(z.object(filters)).output(
    z.object({
      items: z.array(z.object({ facet: z.string(), value: z.string(), count: z.number().int() })),
    }),
  ),
  search: oc
    .input(z.object({ q: z.string().trim().min(1).max(200), cursor, limit }))
    .output(shopCatalogPage),
  /** The ready product page model (`product_view.data`); unknown slug 404. */
  product: oc
    .input(z.object({ slug: z.string().min(1).max(200) }))
    .output(z.object({ product: z.record(z.string(), z.unknown()) })),
}
