import type { OrderState } from "../types"

/**
 * Order `state` transition table (07-siparis §2-3, data). Payment and fulfillment are derived axes
 * and are not part of it; apps may add guards and after-hooks, never new states.
 */
export const ORDER_TRANSITIONS: Readonly<Record<OrderState, readonly OrderState[]>> = {
  placed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
}

export function canTransition(from: OrderState, to: OrderState): boolean {
  return ORDER_TRANSITIONS[from].includes(to)
}
