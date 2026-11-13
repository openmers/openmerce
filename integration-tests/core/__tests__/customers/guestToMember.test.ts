import { linkUserOnVerified, upsertCheckoutCustomer } from "@openmers/core"
import { describeOnTargets } from "@openmers/test-utils"
import { expect, it } from "vitest"
import { seedCustomers } from "./helpers"

describeOnTargets("customers: guest to member", (getDb) => {
  it("case and whitespace map to one guest row; a later verified account binds the same row", async () => {
    const s = await seedCustomers(getDb())
    const first = await upsertCheckoutCustomer(s.ctx, {
      email: " Ann@Example.com ",
      channelId: s.channel.id,
    })
    const again = await upsertCheckoutCustomer(s.ctx, {
      email: "ann@EXAMPLE.com",
      channelId: s.channel.id,
    })
    expect(first.created).toBe(true)
    expect(again).toMatchObject({ customerId: first.customerId, created: false })

    const userId = s.insertUser("ann@example.com", true)
    const linked = await linkUserOnVerified(s.ctx, { userId })
    expect(linked).toEqual({ customerId: first.customerId, publicId: first.publicId })
    expect(s.one<number>("SELECT count(*) FROM customers")).toBe(1)
    expect(s.one<number>("SELECT user_id FROM customers")).toBe(userId)
    expect(s.one<number>("SELECT count(*) FROM customer_channels")).toBe(1)
  })

  it("an unverified sign-up does not bind the guest row (guest orders stay hidden)", async () => {
    const s = await seedCustomers(getDb())
    await upsertCheckoutCustomer(s.ctx, { email: "victim@example.com", channelId: s.channel.id })
    const userId = s.insertUser("victim@example.com", false)
    expect(await linkUserOnVerified(s.ctx, { userId })).toBeNull()
    expect(s.one<number | null>("SELECT user_id FROM customers")).toBeNull()
  })

  it("a verified account without a guest row gets a register row", async () => {
    const s = await seedCustomers(getDb())
    const userId = s.insertUser("new@example.com", true)
    const linked = await linkUserOnVerified(s.ctx, { userId })
    expect(linked?.publicId).toMatch(/^cus_/)
    expect(s.one<string>("SELECT source FROM customers")).toBe("register")
    expect(await linkUserOnVerified(s.ctx, { userId })).toEqual(linked)
  })

  it("the unique index rejects a second row with the same normalized email", async () => {
    const s = await seedCustomers(getDb())
    await upsertCheckoutCustomer(s.ctx, { email: "dup@example.com", channelId: s.channel.id })
    expect(() =>
      getDb()
        .prepare(
          "INSERT INTO customers (public_id, email, email_normalized, source, created_at, updated_at) VALUES ('cus_dup', 'DUP@example.com', 'dup@example.com', 'import', 1, 1)",
        )
        .run(),
    ).toThrow(/UNIQUE/)
  })

  it("checkout without login does not change an existing profile", async () => {
    const s = await seedCustomers(getDb())
    const first = await upsertCheckoutCustomer(s.ctx, {
      email: "bob@example.com",
      channelId: s.channel.id,
      firstName: "Bob",
      phone: "+15550000001",
    })
    const before = s.one<number>("SELECT version FROM customers")
    await upsertCheckoutCustomer(s.ctx, {
      email: "bob@example.com",
      channelId: s.channel.id,
      firstName: "Mallory",
      phone: "+15550000002",
    })
    expect(s.one<string>("SELECT first_name FROM customers")).toBe("Bob")
    expect(s.one<string>("SELECT phone FROM customers")).toBe("+15550000001")
    expect(s.one<number>("SELECT version FROM customers")).toBe(before)
    expect(
      s.one<number>("SELECT count(*) FROM addresses WHERE customer_id = ?", first.customerId),
    ).toBe(0)
  })
})
