import { assertNoFullScan, describeOnTargets } from "@openmers/test-utils"
import { expect, it } from "vitest"
import { sqlitePlatform } from "../../__testing__/sqlitePlatform"
import { getResponse } from "./getResponse"
import { purgeExpired, purgeExpiredStatement } from "./purgeExpired"
import { reserveKey } from "./reserveKey"
import { saveResponse } from "./saveResponse"

const NOW = 1_700_000_000_000
const base = { actorType: "customer", actorId: 7, key: "k-1", requestHash: "h-1" } as const

describeOnTargets("idempotency queries", (getDb) => {
  const platform = () => sqlitePlatform(getDb())

  it("the same key cannot be claimed twice; once the response is written the same response is returned", async () => {
    const p = platform()
    expect(await reserveKey(p, base, NOW)).toBe(true)
    expect(await reserveKey(p, base, NOW)).toBe(false)
    expect((await getResponse(p, base, NOW))?.status).toBe("in_progress")

    expect(
      await saveResponse(
        p,
        {
          actorType: base.actorType,
          actorId: base.actorId,
          key: base.key,
          responseStatus: 201,
          response: { id: "ord_1" },
        },
        NOW,
      ),
    ).toBe(true)
    expect(await getResponse(p, base, NOW)).toEqual({
      status: "done",
      requestHash: "h-1",
      responseStatus: 201,
      response: { id: "ord_1" },
    })
    // the response is written once
    expect(
      await saveResponse(
        p,
        {
          actorType: base.actorType,
          actorId: base.actorId,
          key: base.key,
          responseStatus: 500,
          response: null,
        },
        NOW,
      ),
    ).toBe(false)
  })

  it("a different actor claims the same key separately; anonymous uses 0", async () => {
    const p = platform()
    expect(await reserveKey(p, base, NOW)).toBe(true)
    expect(await reserveKey(p, { ...base, actorId: 8 }, NOW)).toBe(true)
    expect(await reserveKey(p, { ...base, actorType: "anonymous", actorId: undefined }, NOW)).toBe(
      true,
    )
    expect(await getResponse(p, { ...base, actorId: 8 }, NOW)).toMatchObject({
      status: "in_progress",
      requestHash: "h-1",
    })
  })

  it("an expired key can be claimed again, the sweep deletes it", async () => {
    const p = platform()
    expect(await reserveKey(p, { ...base, ttlMs: 1000 }, NOW)).toBe(true)
    expect(await getResponse(p, base, NOW + 1001)).toBeNull()
    expect(await reserveKey(p, { ...base, requestHash: "h-2", ttlMs: 1000 }, NOW + 2000)).toBe(true)
    expect((await getResponse(p, base, NOW + 2000))?.requestHash).toBe("h-2")
    expect(await purgeExpired(p, NOW + 2500)).toBe(0)
    expect(await purgeExpired(p, NOW + 4000)).toBe(1)
    expect(await getResponse(p, base, NOW + 4000)).toBeNull()
  })

  it("the sweep query does not do a full scan", () => {
    const p = platform()
    assertNoFullScan(getDb(), purgeExpiredStatement(p.db, NOW))
  })

  it("the sweep deletes only expired keys", async () => {
    const p = platform()
    await reserveKey(p, { ...base, key: "k-short", ttlMs: 1000 }, NOW)
    await reserveKey(p, { ...base, key: "k-long" }, NOW)
    expect(await purgeExpired(p, NOW + 2000)).toBe(1)
    expect(await getResponse(p, { ...base, key: "k-long" }, NOW + 2000)).not.toBeNull()
  })
})
