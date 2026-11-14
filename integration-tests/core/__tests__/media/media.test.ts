import {
  CUSTOMER_UPLOADS,
  confirmUpload,
  createUpload,
  deleteMedia,
  ownedMedia,
  privateLink,
  sweepCartUploads,
  sweepPending,
} from "@openmers/core"
import { describeOnTargets, jpeg, png } from "@openmers/test-utils"
import { expect, it } from "vitest"
import { NOW } from "../catalog/helpers"
import { seedCheckout } from "../checkout/helpers"

const HOUR = 3_600_000

describeOnTargets("media", (getDb) => {
  const setup = async () => {
    const s = await seedCheckout(getDb(), { a: 0, b: 0 })
    const db = getDb()
    const ctx = { platform: s.p, now: NOW }
    const cartId = (publicId: string) =>
      db.prepare("SELECT id FROM carts WHERE public_id = ?").pluck().get(publicId) as number
    const keyOf = (id: string) =>
      db.prepare("SELECT key FROM media WHERE public_id = ?").pluck().get(id) as string
    const status = (id: string) =>
      db.prepare("SELECT status FROM media WHERE public_id = ?").pluck().get(id) as
        | string
        | undefined
    /** Upload a customer image of `cart` with these bytes (the client's direct PUT). */
    const upload = async (owner: number, bytes: Uint8Array, mime = "image/png", at = NOW) => {
      const t = await createUpload(
        { platform: s.p, now: at },
        {
          mime,
          bytes: bytes.byteLength,
          policy: CUSTOMER_UPLOADS,
          bucket: "private",
          prefix: `personalization/c${owner}`,
          owner: { kind: "cart", id: owner },
        },
      )
      await s.p.storage.put(keyOf(t.id), bytes)
      return t.id
    }
    return { ...s, db, ctx, cartId, keyOf, status, upload }
  }

  it("confirm reads the real type and size; wrong type and oversize are rejected and deleted", async () => {
    const s = await setup()
    const owner = { kind: "cart" as const, id: s.cartId(s.cart()) }
    const ok = await s.upload(owner.id, png(800, 600))
    const r = await confirmUpload(s.ctx, { id: ok, policy: CUSTOMER_UPLOADS, owner })
    expect(r).toMatchObject({ status: "ready", width: 800, height: 600, mime: "image/png" })

    // declared PNG, actually JPEG: header type is not trusted
    const liar = await s.upload(owner.id, jpeg(10, 10))
    const bad = await confirmUpload(s.ctx, { id: liar, policy: CUSTOMER_UPLOADS, owner })
    expect(bad).toMatchObject({ status: "rejected", reason: "type" })
    expect(s.p.storage.keys()).not.toContain(s.keyOf(liar))

    const svg = await s.upload(owner.id, new TextEncoder().encode("<svg/>"))
    expect((await confirmUpload(s.ctx, { id: svg, policy: CUSTOMER_UPLOADS, owner })).reason).toBe(
      "type",
    )

    const big = await s.upload(owner.id, png(10, 10))
    await s.p.storage.put(s.keyOf(big), new Uint8Array(CUSTOMER_UPLOADS.maxBytes + 1))
    const over = await confirmUpload(s.ctx, { id: big, policy: CUSTOMER_UPLOADS, owner })
    expect(over).toMatchObject({ status: "rejected", reason: "too_large" })
    expect(s.status(big)).toBe("rejected")

    const huge = await s.upload(owner.id, png(9000, 10))
    expect((await confirmUpload(s.ctx, { id: huge, policy: CUSTOMER_UPLOADS, owner })).reason).toBe(
      "dimensions",
    )
    await expect(
      createUpload(s.ctx, {
        mime: "image/svg+xml",
        bytes: 10,
        policy: CUSTOMER_UPLOADS,
        bucket: "private",
        prefix: "x",
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" })
  })

  it("another cart's media is not found on confirm and not owned for cart lines", async () => {
    const s = await setup()
    const mine = s.cartId(s.cart())
    const other = s.cartId(s.cart())
    const id = await s.upload(mine, png(10, 10))
    await expect(
      confirmUpload(s.ctx, { id, policy: CUSTOMER_UPLOADS, owner: { kind: "cart", id: other } }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
    await confirmUpload(s.ctx, { id, policy: CUSTOMER_UPLOADS, owner: { kind: "cart", id: mine } })
    expect((await ownedMedia(s.p, { kind: "cart", id: other }, [id])).size).toBe(0)
    expect((await ownedMedia(s.p, { kind: "cart", id: mine }, [id])).has(id)).toBe(true)
  })

  it("delete refuses media a product uses and removes an unused one with its objects", async () => {
    const s = await setup()
    const insert = (publicId: string, key: string) =>
      Number(
        s.db
          .prepare(`INSERT INTO media (public_id, status, bucket, key, mime, sizes, created_at,
            updated_at) VALUES (?, 'ready', 'public', ?, 'image/png', '[320]', ?, ?)`)
          .run(publicId, key, NOW, NOW).lastInsertRowid,
      )
    const used = insert("med_USED000001", "public/media/used.png")
    insert("med_FREE000001", "public/media/free.png")
    await s.p.storage.put("public/media/free.png", png(400, 400))
    await s.p.storage.put("public/media/free_320.webp", "w")
    const productId = s.db.prepare("SELECT id FROM products LIMIT 1").pluck().get() as number
    s.db
      .prepare(`INSERT INTO product_assets (product_id, asset_id, position, created_at)
        VALUES (?, ?, 0, ?)`)
      .run(productId, used, NOW)

    await expect(deleteMedia(s.ctx, { id: "med_USED000001" })).rejects.toMatchObject({
      code: "IN_USE",
    })
    expect(s.status("med_USED000001")).toBe("ready")
    await deleteMedia(s.ctx, { id: "med_FREE000001" })
    expect(s.status("med_FREE000001")).toBeUndefined()
    expect(s.p.storage.keys()).toEqual([])
    await expect(deleteMedia(s.ctx, { id: "med_NONE000001" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    })
  })

  it("sweeps remove only stale uploads and abandoned cart images, with their objects", async () => {
    const s = await setup()
    const live = s.cartId(s.cart())
    const dead = s.cartId(s.cart())
    s.db.prepare("UPDATE carts SET expires_at = ? WHERE id = ?").run(NOW - 1, dead)
    const stale = await s.upload(live, png(10, 10), "image/png", NOW - 2 * HOUR)
    const fresh = await s.upload(live, png(10, 10), "image/png", NOW - 10 * 60_000)
    const kept = await s.upload(live, png(10, 10), "image/png", NOW - 2 * HOUR)
    await confirmUpload(
      { platform: s.p, now: NOW - HOUR },
      { id: kept, policy: CUSTOMER_UPLOADS, owner: { kind: "cart", id: live } },
    )
    const abandoned = await s.upload(dead, png(10, 10))

    expect(await sweepPending(s.ctx)).toBe(1)
    expect(s.status(stale)).toBeUndefined()
    expect(s.status(fresh)).toBe("pending")
    expect(s.status(kept)).toBe("ready")

    expect(await sweepCartUploads(s.ctx)).toBe(1)
    expect(s.status(abandoned)).toBeUndefined()
    expect(s.p.storage.keys().sort()).toEqual([s.keyOf(fresh), s.keyOf(kept)].sort())
  })

  it("private link is a 15-minute signed GET; public or unknown media has none", async () => {
    const s = await setup()
    const owner = { kind: "cart" as const, id: s.cartId(s.cart()) }
    const id = await s.upload(owner.id, png(10, 10))
    await confirmUpload(s.ctx, { id, policy: CUSTOMER_UPLOADS, owner })
    const link = await privateLink(s.ctx, { id })
    expect(link.expiresAt).toBe(NOW + 900_000)
    expect(link.url).toContain("method=GET")
    await expect(privateLink(s.ctx, { id: "med_NONE000001" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    })
  })
})
