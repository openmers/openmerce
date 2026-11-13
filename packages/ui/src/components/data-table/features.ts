import {
  columnFilteringFeature,
  columnOrderingFeature,
  columnVisibilityFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
} from "@tanstack/table-core"
import { storeReactivityBindings } from "@tanstack/table-core/store-reactivity-bindings"

/**
 * The table-core features DataTable uses. Since we use server-side data,
 * sorting/filtering/pagination run "manual"; the table only produces
 * state and the row model.
 */
export const dataTableFeatures = tableFeatures({
  coreReactivityFeature: storeReactivityBindings(),
  rowSelectionFeature,
  rowSortingFeature,
  columnFilteringFeature,
  columnVisibilityFeature,
  columnOrderingFeature,
})

export type DataTableFeatureSet = typeof dataTableFeatures
