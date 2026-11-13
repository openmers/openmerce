import { shopHealth } from "./health"

/** Shop API contract; one file per resource (`shop/<resource>.ts`). */
export const shop = { health: shopHealth }

export { shopHealth, shopHealthOutput } from "./health"
