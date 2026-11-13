import type { ConditionDef } from "../../types"
import { company } from "./company"
import { containsProducts } from "./containsProducts"
import { customerGroup } from "./customerGroup"
import { firstOrder } from "./firstOrder"
import { minAmount } from "./minAmount"
import { personalized } from "./personalized"

/** Built-in conditions, `code` → definition. */
export const BUILT_IN_CONDITIONS: ReadonlyMap<string, ConditionDef<never>> = new Map(
  [minAmount, containsProducts, customerGroup, company, personalized, firstOrder].map(
    (d) => [d.code, d as ConditionDef<never>] as const,
  ),
)
