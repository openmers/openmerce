import { listFiltered } from "@openmers/core"
import { base } from "../../orpc/base"
import { rethrowCatalogIndex } from "./errors"

/** `shop.catalog.list`: collection page and filtered list from the read model. */
export const listCatalog = base.shop.catalog.list.handler(({ input, context }) =>
  listFiltered(context.ctx, input).catch(rethrowCatalogIndex),
)
