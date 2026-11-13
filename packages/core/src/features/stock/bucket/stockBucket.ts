/** Vitrin kesin adet görmez; kova `catalog_index.stock_bucket`'ta durur (04-stok §5). */
export type StockBucket = "in_stock" | "low" | "out"

export type BucketThresholds = {
  /** Satılabilir bu sayıya eşit ya da küçükse (ve > 0) `low`. */
  low: number
}

export const DEFAULT_BUCKET_THRESHOLDS: BucketThresholds = { low: 5 }

/** Satılabilir adet → kova (saf): `<= 0` → `out`, `<= low` → `low`, aksi `in_stock`. */
export function stockBucket(
  available: number,
  thresholds: BucketThresholds = DEFAULT_BUCKET_THRESHOLDS,
): StockBucket {
  if (available <= 0) return "out"
  if (available <= thresholds.low) return "low"
  return "in_stock"
}

/** Kova değişti mi; `reindex` yalnız o zaman üretilir (yoğun satışta önbellek çalkalanmaz). */
export function bucketChanged(
  before: number,
  after: number,
  thresholds: BucketThresholds = DEFAULT_BUCKET_THRESHOLDS,
): boolean {
  return stockBucket(before, thresholds) !== stockBucket(after, thresholds)
}
