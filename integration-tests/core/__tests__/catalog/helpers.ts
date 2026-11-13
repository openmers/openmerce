import { type Channel, type Ctx, createDefaultChannel, loadChannels } from "@openmers/core"
import type Database from "better-sqlite3"
import type { sqlitePlatform } from "../../../../packages/core/src/features/__testing__/sqlitePlatform"

export const NOW = 1_700_000_000_000

export type TestPlatform = ReturnType<typeof sqlitePlatform>

/** Gerçek SQLite üzerinde varsayılan kanal (URL çözümlemesi için birincil alan adıyla). */
export async function seedChannel(p: TestPlatform): Promise<Channel> {
  await createDefaultChannel(p, { publicId: "chn_main", code: "main", domain: "shop.test" }, NOW)
  const channel = (await loadChannels(p))[0]
  if (!channel) throw new Error("varsayılan kanal yok")
  return channel
}

/** Katalog yazımlarının `Ctx`i; `now` sayfa sırasını belirlemek için değiştirilebilir. */
export function catalogCtx(
  p: TestPlatform,
  channel: Channel,
  over: { now?: number; lang?: string } = {},
): Ctx {
  return {
    platform: p,
    api: "admin",
    channel,
    lang: over.lang ?? "en",
    currency: "USD",
    priceListIds: [],
    segment: "admin",
    actor: { type: "admin", id: 1, permissions: new Set(["products:write", "products:read"]) },
    now: over.now ?? NOW,
    requestId: "req_catalog",
  }
}

/** `product_variants.tax_category_id` zorunlu; vergi feature'ı kapsam dışı olduğu için satır elle. */
export function seedTaxCategory(conn: Database.Database, code = "standard"): void {
  conn
    .prepare("INSERT INTO tax_categories (code, name, created_at, updated_at) VALUES (?, ?, ?, ?)")
    .run(code, code, NOW, NOW)
}

/** İki seçenekli (beden × renk) dört varyantlı örnek ürün. */
export function productWithFourVariants(over: { skuPrefix?: string } = {}) {
  const prefix = over.skuPrefix ?? "TS"
  return {
    translations: [
      { lang: "en", name: "T-shirt", slug: `tshirt-${prefix.toLowerCase()}` },
      { lang: "tr", name: "Tişört", slug: `tisort-${prefix.toLowerCase()}` },
    ],
    options: [
      {
        code: "size",
        name: "Beden",
        values: [
          { code: "s", name: "S" },
          { code: "m", name: "M" },
        ],
      },
      {
        code: "color",
        name: "Renk",
        values: [
          { code: "red", name: "Kırmızı" },
          { code: "blue", name: "Mavi" },
        ],
      },
    ],
    variants: [
      { size: "s", color: "red" },
      { size: "s", color: "blue" },
      { size: "m", color: "red" },
      { size: "m", color: "blue" },
    ].map(({ size, color }) => ({
      sku: `${prefix}-${size}-${color}`,
      taxCategoryCode: "standard",
      optionValues: [
        { option: "size", value: size },
        { option: "color", value: color },
      ],
    })),
  }
}
