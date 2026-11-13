import { orders } from "@openmers/db"
import { count, eq } from "drizzle-orm"
import type { AtomicStatement, BatchRows, Platform } from "../../../platform"
import { CUSTOMER_ORDER_COUNT } from "../operations/conditions/firstOrder"
import type { CompiledPromotion } from "../types"

export type RequirementCtx = { customerId: number | null }

type Requirement = {
  /** `null`: sorgu gerekmez, değer yok (ör. misafir). */
  query(p: Pick<Platform, "db">, ctx: RequirementCtx): AtomicStatement | null
  read(rows: BatchRows): unknown
}

const REQUIREMENTS: Record<string, Requirement> = {
  [CUSTOMER_ORDER_COUNT]: {
    query: (p, ctx) =>
      ctx.customerId === null
        ? null
        : p.db
            .select({ n: count() })
            .from(orders)
            .where(eq(orders.customerId, ctx.customerId))
            .toSQL(),
    read: (rows) => Number(rows[0]?.n ?? 0),
  },
}

export type CollectedRequirements = {
  /** Sepet verisi `batch`'ine eklenecek sorgular (ek tur yok). */
  queries: AtomicStatement[]
  /** `batch` sonucundaki bu sorguların satırlarını (aynı sırada) `PromoCart.data`'ya çevirir. */
  read(rows: readonly BatchRows[]): Record<string, unknown>
}

/**
 * Promosyon koşullarının `requires` anahtarlarını toplar (08-promosyon §2): her anahtar en çok bir
 * sorgu, hepsi çağıranın sepet verisi `batch`'ine girer. Bilinmeyen anahtar hatadır.
 */
export function collectRequirements(
  p: Pick<Platform, "db">,
  promotions: readonly CompiledPromotion[],
  ctx: RequirementCtx,
): CollectedRequirements {
  const keys = [...new Set(promotions.flatMap((pr) => pr.requires))].sort()
  const planned: { key: string; req: Requirement }[] = []
  const queries: AtomicStatement[] = []
  for (const key of keys) {
    const req = REQUIREMENTS[key]
    if (!req) throw new Error(`bilinmeyen promosyon gereksinimi: ${key}`)
    const q = req.query(p, ctx)
    if (q === null) continue
    planned.push({ key, req })
    queries.push(q)
  }
  return {
    queries,
    read: (rows) =>
      Object.fromEntries(planned.map(({ key, req }, i) => [key, req.read(rows[i] ?? [])])),
  }
}
