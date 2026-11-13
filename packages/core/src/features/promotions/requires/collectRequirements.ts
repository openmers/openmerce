import { orders } from "@openmers/db"
import { count, eq } from "drizzle-orm"
import type { AtomicStatement, BatchRows, Platform } from "../../../platform"
import { CUSTOMER_ORDER_COUNT } from "../operations/conditions/firstOrder"
import type { CompiledPromotion } from "../types"

export type RequirementCtx = { customerId: number | null }

type Requirement = {
  /** `null`: no query needed, no value (e.g. guest). */
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
  /** Queries to add to the cart data `batch` (no extra round trip). */
  queries: AtomicStatement[]
  /** Converts the rows of these queries in the `batch` result (in the same order) into `PromoCart.data`. */
  read(rows: readonly BatchRows[]): Record<string, unknown>
}

/**
 * Collects the `requires` keys of promotion conditions (08-promosyon §2): at most one query per key,
 * all of them go into the caller's cart data `batch`. An unknown key is an error.
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
