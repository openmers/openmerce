import { ADDRESS_LIMIT, addAddress, deleteAddress, upsertCheckoutCustomer } from "@openmers/core"
import { describeOnTargets } from "@openmers/test-utils"
import { expect, it } from "vitest"
import { seedCustomers } from "./helpers"

const ADDRESS = { addressLine1: "1 Main St", city: "Springfield", country: "US" }

describeOnTargets("customers: address book", (getDb) => {
  it("the 21st address is rejected and writes nothing", async () => {
    const s = await seedCustomers(getDb())
    const { customerId } = await upsertCheckoutCustomer(s.ctx, {
      email: "a@example.com",
      channelId: s.channel.id,
    })
    let version = 0
    for (let i = 0; i < ADDRESS_LIMIT; i += 1) {
      ;({ version } = await addAddress(s.ctx, { customerId, version, address: ADDRESS }))
    }
    await expect(
      addAddress(s.ctx, { customerId, version, address: ADDRESS }),
    ).rejects.toMatchObject({
      code: "LIMIT_EXCEEDED",
    })
    expect(s.one<number>("SELECT count(*) FROM addresses")).toBe(ADDRESS_LIMIT)
    expect(s.one<number>("SELECT version FROM customers")).toBe(version)
  })

  it("a stale version is rejected", async () => {
    const s = await seedCustomers(getDb())
    const { customerId } = await upsertCheckoutCustomer(s.ctx, {
      email: "b@example.com",
      channelId: s.channel.id,
    })
    await addAddress(s.ctx, { customerId, version: 0, address: ADDRESS })
    await expect(
      addAddress(s.ctx, { customerId, version: 0, address: ADDRESS }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
    })
    expect(s.one<number>("SELECT count(*) FROM addresses")).toBe(1)
  })

  it("deleting the default address clears the default without picking another", async () => {
    const s = await seedCustomers(getDb())
    const { customerId } = await upsertCheckoutCustomer(s.ctx, {
      email: "c@example.com",
      channelId: s.channel.id,
    })
    const first = await addAddress(s.ctx, {
      customerId,
      version: 0,
      address: ADDRESS,
      defaultShipping: true,
      defaultBilling: true,
    })
    const second = await addAddress(s.ctx, { customerId, version: first.version, address: ADDRESS })
    await deleteAddress(s.ctx, { customerId, version: second.version, publicId: first.publicId })
    expect(s.one<number | null>("SELECT default_shipping_address_id FROM customers")).toBeNull()
    expect(s.one<number | null>("SELECT default_billing_address_id FROM customers")).toBeNull()
    expect(s.one<number>("SELECT count(*) FROM addresses")).toBe(1)
  })

  it("invalid format and another customer's address are rejected", async () => {
    const s = await seedCustomers(getDb())
    const a = await upsertCheckoutCustomer(s.ctx, {
      email: "d@example.com",
      channelId: s.channel.id,
    })
    const b = await upsertCheckoutCustomer(s.ctx, {
      email: "e@example.com",
      channelId: s.channel.id,
    })
    await expect(
      addAddress(s.ctx, {
        customerId: a.customerId,
        version: 0,
        address: { ...ADDRESS, phone: "555" },
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" })
    const own = await addAddress(s.ctx, { customerId: a.customerId, version: 0, address: ADDRESS })
    await expect(
      deleteAddress(s.ctx, { customerId: b.customerId, version: 0, publicId: own.publicId }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
