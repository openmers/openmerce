import type { CalculatorDef } from "../types"
import { desi } from "./desi"
import { flat } from "./flat"
import { freeOver } from "./freeOver"
import { weightTier } from "./weightTier"

/** Built-in calculators, `code` → definition (no queries). */
export const BUILT_IN_CALCULATORS: ReadonlyMap<string, CalculatorDef<never>> = new Map(
  [flat, weightTier, desi, freeOver].map((d) => [d.code, d as CalculatorDef<never>] as const),
)
