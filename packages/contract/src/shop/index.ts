import { shopHealth } from "./health"

/** Shop API sözleşmesi; kaynak başına bir dosya (`shop/<kaynak>.ts`). */
export const shop = { health: shopHealth }

export { shopHealth, shopHealthOutput } from "./health"
