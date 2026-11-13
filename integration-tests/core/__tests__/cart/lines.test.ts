import { addLine, removeLine, updateLine } from "@openmers/core"
import { describeOnTargets } from "@openmers/test-utils"
import { expect, it } from "vitest"
import { NOW } from "../catalog/helpers"
import { seedCheckout } from "../checkout/helpers"
import { count } from "../stock/helpers"

const DEF = {
  enabled: true,
  fields: [
    { key: "engraving", type: "text", maxLength: 20 },
    { key: "artwork", type: "image", mime: ["image/png"] },
  ],
}

describeOnTargets("cart lines", (getDb) => {
  const setup = async () => {
    const s = await seedCheckout(getDb(), { a: 0, b: 0 })
    getDb().prepare("UPDATE products SET personalization = ?").run(JSON.stringify(DEF))
    const ctx = { platform: s.p, now: NOW }
    const cartId = (publicId: string) =>
      getDb().prepare("SELECT id FROM carts WHERE public_id = ?").pluck().get(publicId) as number
    const media = (publicId: string, ownerId: number) =>
      getDb()
        .prepare(`INSERT INTO media (public_id, status, bucket, key, mime, bytes, owner_kind,
            owner_id, created_at, updated_at) VALUES (?, 'ready', 'private', ?, 'image/png', 10,
            'cart', ?, ?, ?)`)
        .run(publicId, `k/${publicId}`, ownerId, NOW, NOW)
    return { ...s, ctx, cartId, media }
  }
  const lines = () =>
    getDb().prepare("SELECT quantity, line_key FROM cart_lines ORDER BY id").all() as {
      quantity: number
      line_key: string
    }[]

  it("same engraving adds quantity, different engraving is a new line; version bumps per write", async () => {
    const s = await setup()
    const cart = s.cart()
    const add = (engraving: string) =>
      addLine(s.ctx, {
        cartPublicId: cart,
        variantPublicId: s.variants.a,
        quantity: 1,
        personalization: { engraving },
      })
    const first = await add("Ada")
    const second = await add(" Ada ")
    expect(second.lineKey).toBe(first.lineKey)
    await add("Ece")
    expect(lines().map((l) => l.quantity)).toEqual([2, 1])
    expect(second.version).toBe(2)
    await expect(
      addLine(s.ctx, {
        cartPublicId: cart,
        variantPublicId: s.variants.a,
        quantity: 1,
        version: 0,
      }),
    ).rejects.toMatchObject({ code: "CART_CHANGED" })
  })

  it("edit: new key replaces the old line keeping quantity; remove", async () => {
    const s = await setup()
    const cart = s.cart()
    const { lineKey } = await addLine(s.ctx, {
      cartPublicId: cart,
      variantPublicId: s.variants.a,
      quantity: 2,
      personalization: { engraving: "Ada" },
    })
    const edited = await updateLine(s.ctx, {
      cartPublicId: cart,
      variantPublicId: s.variants.a,
      lineKey,
      quantity: 2,
      personalization: { engraving: "Ece" },
    })
    expect(lines()).toEqual([{ quantity: 2, line_key: edited.lineKey }])
    await removeLine(s.ctx, {
      cartPublicId: cart,
      variantPublicId: s.variants.a,
      lineKey: edited.lineKey,
    })
    expect(count(getDb(), "cart_lines")).toBe(0)
  })

  it("rejects another cart's image media_id; accepts its own", async () => {
    const s = await setup()
    const [mine, other] = [s.cart(), s.cart()]
    s.media("med_MINE000001", s.cartId(mine))
    s.media("med_OTHER00001", s.cartId(other))
    const add = (artwork: string) =>
      addLine(s.ctx, {
        cartPublicId: mine,
        variantPublicId: s.variants.a,
        quantity: 1,
        personalization: { artwork },
      })
    await expect(add("med_OTHER00001")).rejects.toMatchObject({
      code: "PERSONALIZATION_INVALID",
      field: { key: "artwork", reason: "MEDIA_NOT_FOUND" },
    })
    await expect(add("med_MINE000001")).resolves.toMatchObject({ version: 1 })
  })

  it("rejects personalization on a disabled variant", async () => {
    const s = await setup()
    getDb().prepare("UPDATE product_variants SET personalization = '{\"enabled\":false}'").run()
    await expect(
      addLine(s.ctx, {
        cartPublicId: s.cart(),
        variantPublicId: s.variants.a,
        quantity: 1,
        personalization: { engraving: "x" },
      }),
    ).rejects.toMatchObject({ code: "PERSONALIZATION_NOT_ALLOWED" })
  })
})
