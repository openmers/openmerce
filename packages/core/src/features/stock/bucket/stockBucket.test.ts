import { describe, expect, it } from "vitest"
import { bucketChanged, stockBucket } from "./stockBucket"

describe("stockBucket", () => {
  it("thresholds: <= 0 out, <= low low, otherwise in_stock", () => {
    expect(stockBucket(-3)).toBe("out")
    expect(stockBucket(0)).toBe("out")
    expect(stockBucket(1)).toBe("low")
    expect(stockBucket(5)).toBe("low")
    expect(stockBucket(6)).toBe("in_stock")
    expect(stockBucket(10, { low: 10 })).toBe("low")
    expect(stockBucket(1, { low: 0 })).toBe("in_stock")
  })

  it("bucketChanged is true only when the bucket changes", () => {
    expect(bucketChanged(100, 50)).toBe(false)
    expect(bucketChanged(6, 5)).toBe(true)
    expect(bucketChanged(3, 2)).toBe(false)
    expect(bucketChanged(1, 0)).toBe(true)
    expect(bucketChanged(0, -2)).toBe(false)
  })
})
