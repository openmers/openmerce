import type { OrderSummary, OrderView } from "@openmers/core"

/** Core order read → contract shape (`publicId` → `id`; no internal ids). */
export function orderSummary({ publicId, ...rest }: OrderSummary) {
  return { id: publicId, ...rest }
}

export function orderView(order: OrderView) {
  const { publicId, lines, payments, ...rest } = order
  return {
    id: publicId,
    ...rest,
    lines: lines.map(({ publicId: id, ...l }) => ({ id, ...l })),
    payments: payments.map(({ publicId: id, ...p }) => ({ id, ...p })),
  }
}
