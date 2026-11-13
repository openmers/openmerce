import { admin } from "./admin"
import { shop } from "./shop"

/**
 * A single contract: web and mobile use the same typed client (`02-api-ve-istek-baglami` §1).
 * `apps/api` only implements it via `implement(contract)`; clients depend on the contract.
 */
export const contract = { shop, admin }

export * from "./shared"
export { admin, shop }
