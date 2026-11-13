import { listCatalogFacets } from "./facets"
import { listCatalog } from "./list"
import { getCatalogProduct } from "./product"
import { searchCatalog } from "./search"

/** Shop catalog router: same shape as `contract.shop.catalog`; handlers only call `catalogIndex`. */
export const catalogRouter = {
  list: listCatalog,
  facets: listCatalogFacets,
  search: searchCatalog,
  product: getCatalogProduct,
}
