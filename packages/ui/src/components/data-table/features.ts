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
 * DataTable'ın kullandığı tablo çekirdeği özellikleri. Sunucu taraflı veri
 * kullandığımız için sıralama/süzme/pagination "manual" çalışır; tablo yalnız
 * durum ve satır modeli üretir.
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
