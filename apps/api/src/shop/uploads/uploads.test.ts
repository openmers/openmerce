import { png } from "@openmers/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import { admin, commerceHarness, type Harness } from "../checkout/testHarness"

const closers: (() => void)[] = []
afterEach(() => {
  for (const close of closers.splice(0)) close()
})

/** The client's direct `PUT` to the signed URL (memory driver: the path is the key). */
const putTo = (h: Harness, uploadUrl: string, bytes: Uint8Array) =>
  h.storage.put(decodeURIComponent(new URL(uploadUrl).pathname.slice(1)), bytes)

describe("uploads", () => {
  it("customer: create → upload → confirm; another cart cannot confirm it", async () => {
    const h = await commerceHarness(closers)
    const c = h.client()
    const image = png(1200, 900)
    const t = await c.call("shop/uploads/create", { mime: "image/png", bytes: image.byteLength })
    expect(t.status).toBe(200)
    expect(t.json.uploadUrl).toContain("/private/personalization/")
    expect(t.res.headers.get("cache-control")).toBe("no-store")

    const early = await c.call("shop/uploads/confirm", { id: t.json.id })
    expect(early.status).toBe(409)

    await putTo(h, t.json.uploadUrl, image)
    const other = h.client()
    await other.call("shop/uploads/create", { mime: "image/png", bytes: 10 })
    expect((await other.call("shop/uploads/confirm", { id: t.json.id })).status).toBe(404)

    const ok = await c.call("shop/uploads/confirm", { id: t.json.id })
    expect(ok.json).toEqual({
      id: t.json.id,
      status: "ready",
      width: 1200,
      height: 900,
      reason: null,
    })
    expect((await c.call("shop/uploads/create", { mime: "image/svg+xml", bytes: 10 })).status).toBe(
      400,
    )
  })

  it("admin: library upload, list with a ready URL, delete refused while used", async () => {
    const h = await commerceHarness(closers)
    const a = await admin(h)
    const image = png(500, 400)
    const t = await a.call("admin/media/create", { mime: "image/png", bytes: image.byteLength })
    expect(t.status).toBe(200)
    await putTo(h, t.json.uploadUrl, image)
    expect((await a.call("admin/media/confirm", { id: t.json.id })).json.status).toBe("ready")

    const list = await a.call("admin/media/list", {})
    expect(list.json.items).toHaveLength(1)
    expect(list.json.items[0]).toMatchObject({ id: t.json.id, bucket: "public" })
    expect(list.json.items[0].image.url).toMatch(/^https:\/\/media\.test\/public\/media\//)

    const mediaId = h.one<number>("SELECT id FROM media")
    const productId = h.one<number>("SELECT id FROM products")
    const asset = h.run(
      "INSERT INTO product_assets (product_id, asset_id, position, created_at) VALUES (?, ?, 0, ?)",
      productId,
      mediaId,
      0,
    )
    const refused = await a.call("admin/media/delete", { id: t.json.id })
    expect(refused.status).toBe(409)
    h.run("DELETE FROM product_assets WHERE id = ?", asset)
    expect((await a.call("admin/media/delete", { id: t.json.id })).json).toEqual({ ok: true })
    expect((await a.call("admin/media/list", {})).json.items).toEqual([])
    expect(h.storage.keys()).toEqual([])
    expect((await h.client().call("admin/media/list", {})).status).toBe(401)
  })
})
