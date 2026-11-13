/** The storefront never sees exact quantities; the bucket lives in `catalog_index.stock_bucket` (04-stok §5). */
export type StockBucket = "in_stock" | "low" | "out"

export type BucketThresholds = {
  /** `low` if sellable is equal to or less than this number (and > 0). */
  low: number
}

export const DEFAULT_BUCKET_THRESHOLDS: BucketThresholds = { low: 5 }

/** Sellable quantity → bucket (pure): `<= 0` → `out`, `<= low` → `low`, otherwise `in_stock`. */
export function stockBucket(
  available: number,
  thresholds: BucketThresholds = DEFAULT_BUCKET_THRESHOLDS,
): StockBucket {
  if (available <= 0) return "out"
  if (available <= thresholds.low) return "low"
  return "in_stock"
}

/** Whether the bucket changed; `reindex` is only produced then (no cache churn under heavy sales). */
export function bucketChanged(
  before: number,
  after: number,
  thresholds: BucketThresholds = DEFAULT_BUCKET_THRESHOLDS,
): boolean {
  return stockBucket(before, thresholds) !== stockBucket(after, thresholds)
}
