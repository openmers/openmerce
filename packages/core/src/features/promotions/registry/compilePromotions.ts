import type { promotions } from "@openmers/db"
import { BUILT_IN_ACTIONS } from "../operations/actions"
import { BUILT_IN_CONDITIONS } from "../operations/conditions"
import type { ActionDef, CompiledPromotion, ConditionDef } from "../types"

export type PromotionRow = typeof promotions.$inferSelect
export type PromotionChannelLink = { promotionId: number; channelId: number }

export type CompiledPromotions = {
  /** Kanal → etkin promosyonlar, öncelik sırasında (yüksek önce, eşitlikte küçük `id`). */
  byChannel: Map<number, CompiledPromotion[]>
  /** Derlenemeyen (bilinmeyen kod, geçersiz argüman) promosyonlar; uygulanmaz. */
  invalid: { id: number; reason: string }[]
}

type Rule = { code: string; args: Record<string, unknown> }

function compileRules<D extends ConditionDef<never> | ActionDef<never>>(
  rules: readonly Rule[],
  defs: ReadonlyMap<string, D>,
): { def: D; args: never }[] {
  return rules.map((rule) => {
    const def = defs.get(rule.code)
    if (!def) throw new Error(`bilinmeyen operasyon: ${rule.code}`)
    const parsed = def.args.safeParse(rule.args ?? {})
    if (!parsed.success) throw new Error(`${rule.code}: ${parsed.error.message}`)
    return { def, args: parsed.data }
  })
}

/**
 * Etkin promosyonları kanal başına derler (08-promosyon §2): argümanlar bir kez doğrulanır,
 * koşul/eylem işlevleri kapanışa bağlanır. Kanal bağlantısı `promotion_channels`; bağlantısız
 * promosyon hiçbir kanalda çalışmaz. `enabled = false` olanlar alınmaz.
 */
export function compilePromotions(
  rows: readonly PromotionRow[],
  links: readonly PromotionChannelLink[],
  opts: {
    conditions?: ReadonlyMap<string, ConditionDef<never>>
    actions?: ReadonlyMap<string, ActionDef<never>>
  } = {},
): CompiledPromotions {
  const channelsOf = new Map<number, Set<number>>()
  for (const l of links) {
    const set = channelsOf.get(l.promotionId) ?? new Set<number>()
    set.add(l.channelId)
    channelsOf.set(l.promotionId, set)
  }
  const byChannel = new Map<number, CompiledPromotion[]>()
  const invalid: CompiledPromotions["invalid"] = []
  for (const row of rows) {
    if (!row.enabled) continue
    let compiled: CompiledPromotion
    try {
      const conds = compileRules(row.conditions, opts.conditions ?? BUILT_IN_CONDITIONS)
      const acts = compileRules(row.actions, opts.actions ?? BUILT_IN_ACTIONS)
      compiled = {
        id: row.id,
        publicId: row.publicId,
        name: row.name,
        priority: row.priority,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        couponCode: row.couponCode,
        usageLimit: row.usageLimit,
        perCustomerLimit: row.perCustomerLimit,
        used: row.used,
        stackable: row.stackable,
        applyToContract: row.applyToContract,
        channelIds: channelsOf.get(row.id) ?? new Set(),
        conditions: conds.map(
          ({ def, args }) =>
            (view) =>
              def.check(args, view),
        ),
        actions: acts.map(
          ({ def, args }) =>
            (state) =>
              def.run(args, state),
        ),
        requires: [...new Set(conds.flatMap(({ def }) => def.requires ?? []))],
      }
    } catch (error) {
      invalid.push({ id: row.id, reason: error instanceof Error ? error.message : String(error) })
      continue
    }
    for (const channelId of compiled.channelIds) {
      const list = byChannel.get(channelId) ?? []
      list.push(compiled)
      byChannel.set(channelId, list)
    }
  }
  for (const list of byChannel.values()) list.sort(byPriority)
  return { byChannel, invalid }
}

export function byPriority(a: CompiledPromotion, b: CompiledPromotion): number {
  return b.priority - a.priority || a.id - b.id
}
