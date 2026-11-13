import { describe, expect, it } from "vitest"
import { z } from "zod"
import {
  cursorInputSchema,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  pageSchema,
  withTotal,
} from "./pagination"

describe("cursorInputSchema", () => {
  it("limit varsayılanı ve imleç isteğe bağlı", () => {
    expect(cursorInputSchema.parse({})).toEqual({ limit: DEFAULT_PAGE_SIZE })
    expect(cursorInputSchema.parse({ cursor: "abc", limit: 10 })).toEqual({
      cursor: "abc",
      limit: 10,
    })
  })

  it("limit sınırları", () => {
    expect(cursorInputSchema.safeParse({ limit: 0 }).success).toBe(false)
    expect(cursorInputSchema.safeParse({ limit: MAX_PAGE_SIZE + 1 }).success).toBe(false)
    expect(cursorInputSchema.safeParse({ limit: 1.5 }).success).toBe(false)
    expect(cursorInputSchema.safeParse({ cursor: "" }).success).toBe(false)
  })
})

describe("pageSchema", () => {
  it("{ items, nextCursor } ve null imleç", () => {
    const schema = pageSchema(z.object({ id: z.string() }))
    expect(schema.parse({ items: [{ id: "a" }], nextCursor: null })).toEqual({
      items: [{ id: "a" }],
      nextCursor: null,
    })
    expect(schema.safeParse({ items: [] }).success).toBe(false)
    expect(schema.safeParse({ items: [], nextCursor: null, total: 0 }).success).toBe(true)
  })
})

describe("withTotal", () => {
  it("total ekler, page alanlarını korur", () => {
    const schema = withTotal(pageSchema(z.object({ id: z.string() })))
    expect(schema.parse({ items: [], nextCursor: "c1", total: 0 })).toEqual({
      items: [],
      nextCursor: "c1",
      total: 0,
    })
    expect(schema.safeParse({ items: [], nextCursor: null }).success).toBe(false)
    expect(schema.safeParse({ items: [], nextCursor: null, total: -1 }).success).toBe(false)
  })
})
