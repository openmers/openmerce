import { admin } from "./admin"
import { shop } from "./shop"

/**
 * Tek sözleşme: web ve mobil aynı tipli istemciyi kullanır (`02-api-ve-istek-baglami` §1).
 * `apps/api` yalnız `implement(contract)` ile uygular; istemciler sözleşmeye bağlıdır.
 */
export const contract = { shop, admin }

export * from "./shared"
export { admin, shop }
