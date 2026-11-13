import {
  bankTransfer,
  type CompiledPromotion,
  cashOnDelivery,
  compilePromotions,
  createPaymentRegistry,
  loadPaymentMethods,
  loadPromotions,
  loadShippingMethods,
  loadTaxConfig,
  type PaymentHandler,
  type PaymentRegistry,
  type Platform,
  type ShippingMethod,
  sqlStatement,
  type TaxConfig,
} from "@openmers/core"
import { sql } from "drizzle-orm"

type PriceListRow = { id: number; publicId: string; channelId: number; type: string }

/** Commerce configuration held in memory: the cart read then needs only its own two rounds. */
export type CommerceConfig = {
  promotions: Map<number, CompiledPromotion[]>
  shippingMethods: ShippingMethod[]
  tax: TaxConfig
  payments: PaymentRegistry
  priceLists: PriceListRow[]
}

export type CommerceConfigSource = { get(now: number): Promise<CommerceConfig> }

/** Built-in manual handlers; apps and tests add theirs (`handlers` option). */
export const BUILT_IN_PAYMENT_HANDLERS: Readonly<Record<string, PaymentHandler>> = {
  bankTransfer,
  cashOnDelivery,
}

async function load(
  platform: Platform,
  handlers: Readonly<Record<string, PaymentHandler>>,
): Promise<CommerceConfig> {
  const [{ rows, links }, shippingMethods, tax, methods, [lists = []]] = await Promise.all([
    loadPromotions(platform),
    loadShippingMethods(platform),
    loadTaxConfig(platform),
    loadPaymentMethods(platform),
    platform.batch([
      sqlStatement(sql`SELECT "id", "public_id", "channel_id", "type" FROM "price_lists"`),
    ]),
  ])
  return {
    promotions: compilePromotions(rows, links).byChannel,
    shippingMethods,
    tax,
    payments: createPaymentRegistry(methods, handlers),
    priceLists: lists.map((r) => ({
      id: Number(r.id),
      publicId: String(r.public_id),
      channelId: Number(r.channel_id),
      type: String(r.type),
    })),
  }
}

/**
 * Loads promotions, shipping methods, tax tables, payment methods and price lists once and keeps
 * them for `ttlMs`; concurrent requests share one load.
 */
// shortcut: time-based refresh only (no settings version for these tables yet); switch to a
// version check like the channel registry once admin writes bump one.
export function createCommerceConfig(opts: {
  platform: Platform
  handlers?: Readonly<Record<string, PaymentHandler>>
  ttlMs?: number
}): CommerceConfigSource {
  const handlers = { ...BUILT_IN_PAYMENT_HANDLERS, ...opts.handlers }
  const ttlMs = opts.ttlMs ?? 30_000
  let cached: { at: number; value: Promise<CommerceConfig> } | undefined
  return {
    get(now) {
      if (!cached || now - cached.at >= ttlMs) {
        const value = load(opts.platform, handlers)
        cached = { at: now, value }
        value.catch(() => {
          if (cached?.value === value) cached = undefined
        })
      }
      return cached.value
    },
  }
}

/**
 * Price lists a session may use (`public_id`): the channel's non-contract lists plus the
 * customer's own lists. Contract lists never leak to guests.
 */
export function sessionPriceLists(
  config: CommerceConfig,
  channelId: number,
  customerListIds: readonly number[],
): string[] {
  const own = new Set(customerListIds)
  return config.priceLists
    .filter((l) => (l.channelId === channelId && l.type !== "contract") || own.has(l.id))
    .map((l) => l.publicId)
}
