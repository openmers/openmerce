import { describe, expect, it } from "vitest"
import { z } from "zod"
import { BULK_MAX_RECORDS, bulkInput, bulkResult, bulkResults } from "./bulk"

const item = z.object({ sku: z.string().min(1) })

describe("bulkInput", () => {
  it("500 entries accepted, 501 rejected (tests item)", () => {
    const schema = bulkInput(item)
    expect(BULK_MAX_RECORDS).toBe(500)
    expect(
      schema.safeParse({ items: Array.from({ length: 500 }, () => ({ sku: "a" })) }).success,
    ).toBe(true)
    expect(
      schema.safeParse({ items: Array.from({ length: 501 }, () => ({ sku: "a" })) }).success,
    ).toBe(false)
  })

  it("custom upper limit", () => {
    const schema = bulkInput(item, 2)
    expect(schema.safeParse({ items: [{ sku: "a" }, { sku: "b" }] }).success).toBe(true)
    expect(schema.safeParse({ items: [{ sku: "a" }, { sku: "b" }, { sku: "c" }] }).success).toBe(
      false,
    )
  })

  it("an empty list and an invalid entry are rejected", () => {
    expect(bulkInput(item).safeParse({ items: [] }).success).toBe(false)
    expect(bulkInput(item).safeParse({ items: [{ sku: "" }] }).success).toBe(false)
  })
})

describe("bulkResult", () => {
  it("a successful entry carries its value", () => {
    const schema = bulkResults(item)
    const parsed = schema.parse([
      { ok: true, index: 0, value: { sku: "a" } },
      { ok: false, index: 1, code: "CONFLICT", message: "stok yok" },
    ])
    expect(parsed[0]).toEqual({ ok: true, index: 0, value: { sku: "a" } })
    expect(parsed[1]).toEqual({ ok: false, index: 1, code: "CONFLICT", message: "stok yok" })
  })

  it("an unknown error code and a missing index are rejected", () => {
    const schema = bulkResult(item)
    expect(schema.safeParse({ ok: false, index: 0, code: "YOK" }).success).toBe(false)
    expect(schema.safeParse({ ok: true, value: { sku: "a" } }).success).toBe(false)
    expect(schema.safeParse({ ok: true, index: -1, value: { sku: "a" } }).success).toBe(false)
  })
})
