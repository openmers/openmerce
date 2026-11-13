import {
  addGroupMember,
  commerceGroupIds,
  createManualGroup,
  linkUserOnVerified,
  removeGroupMember,
  upsertCheckoutCustomer,
} from "@openmers/core"
import { describeOnTargets } from "@openmers/test-utils"
import { expect, it } from "vitest"
import { seedCustomers } from "./helpers"

async function member(s: Awaited<ReturnType<typeof seedCustomers>>, email: string) {
  const c = await upsertCheckoutCustomer(s.ctx, { email, channelId: s.channel.id })
  const userId = s.insertUser(email, true)
  await linkUserOnVerified(s.ctx, { userId })
  return { ...c, userId }
}

describeOnTargets("customers: manual groups", (getDb) => {
  it("a marketing group does not bump the session version nor enter the session", async () => {
    const s = await seedCustomers(getDb())
    const c = await member(s, "m@example.com")
    const group = await createManualGroup(s.ctx, { name: "Newsletter", affectsCommerce: false })
    expect(
      await addGroupMember(s.ctx, { groupPublicId: group.publicId, customerPublicId: c.publicId }),
    ).toEqual({
      changed: true,
    })
    expect(s.one<number>("SELECT session_version FROM users WHERE id = ?", c.userId)).toBe(0)
    expect(await commerceGroupIds(s.p, c.customerId)).toEqual([])
  })

  it("a commerce group change bumps only that customer's session version", async () => {
    const s = await seedCustomers(getDb())
    const c = await member(s, "c@example.com")
    const other = await member(s, "o@example.com")
    const group = await createManualGroup(s.ctx, { name: "Wholesale", affectsCommerce: true })
    const input = { groupPublicId: group.publicId, customerPublicId: c.publicId }
    await addGroupMember(s.ctx, input)
    expect(await addGroupMember(s.ctx, input)).toEqual({ changed: false })
    const version = (id: number) =>
      s.one<number>("SELECT session_version FROM users WHERE id = ?", id)
    expect(version(c.userId)).toBe(1)
    expect(version(other.userId)).toBe(0)
    expect(await commerceGroupIds(s.p, c.customerId)).toHaveLength(1)
    expect(await removeGroupMember(s.ctx, input)).toEqual({ changed: true })
    expect(version(c.userId)).toBe(2)
    expect(s.one<number>("SELECT count(*) FROM audit_log WHERE action = 'customers:write'")).toBe(3)
  })

  it("caps commerce groups at 50 per customer", async () => {
    const s = await seedCustomers(getDb())
    const c = await member(s, "cap@example.com")
    for (let i = 0; i < 50; i += 1) {
      const g = await createManualGroup(s.ctx, { name: `G${i}`, affectsCommerce: true })
      await addGroupMember(s.ctx, { groupPublicId: g.publicId, customerPublicId: c.publicId })
    }
    const extra = await createManualGroup(s.ctx, { name: "G50", affectsCommerce: true })
    await expect(
      addGroupMember(s.ctx, { groupPublicId: extra.publicId, customerPublicId: c.publicId }),
    ).rejects.toMatchObject({ code: "LIMIT_EXCEEDED" })
    expect(s.one<number>("SELECT session_version FROM users WHERE id = ?", c.userId)).toBe(50)
  })
})
