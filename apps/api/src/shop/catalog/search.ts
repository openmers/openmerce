import { search } from "@openmers/core"
import { base } from "../../orpc/base"
import { rethrowCatalogIndex } from "./errors"

/** `shop.catalog.search`: FTS5 prefix search on folded text. */
export const searchCatalog = base.shop.catalog.search.handler(({ input, context }) =>
  search(context.ctx, input).catch(rethrowCatalogIndex),
)
