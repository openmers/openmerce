import type { ActionDef } from "../../types"
import { lineAmount } from "./lineAmount"
import { linePercent } from "./linePercent"
import { orderAmount } from "./orderAmount"
import { shippingPercent } from "./shippingPercent"

/** Yerleşik eylemler, `code` → tanım. */
export const BUILT_IN_ACTIONS: ReadonlyMap<string, ActionDef<never>> = new Map(
  [linePercent, lineAmount, orderAmount, shippingPercent].map(
    (d) => [d.code, d as ActionDef<never>] as const,
  ),
)
