import { z } from "zod"
import { allocateOrderDiscount } from "../../../tax/calc/allocateOrderDiscount"
import type { ActionDef } from "../../types"

/**
 * Sipariş indirimi: `amount` satırların kalanına oransal dağıtılır (vergi `allocateOrderDiscount`,
 * kalan kuruş kuralı orada); toplam kalanı aşarsa kırpılır.
 */
export const orderAmount: ActionDef<{ amount: number }> = {
  code: "orderAmount",
  args: z.object({ amount: z.number().int().min(1) }),
  run: (args, state) => {
    const shares = allocateOrderDiscount(
      args.amount,
      state.lines.map((s) => s.remaining),
    )
    const allocation = state.lines.map((s, i) => ({ lineKey: s.line.key, amount: shares[i] ?? 0 }))
    const amount = shares.reduce((a, b) => a + b, 0)
    return [{ target: "order", amount, allocation }]
  },
}
