import { assertNoFullScan, describeOnTargets } from "@openmers/test-utils"
import { expect, it } from "vitest"
import { sqlitePlatform } from "../../__testing__/sqlitePlatform"
import { getResponse } from "./getResponse"
import { purgeExpired, purgeExpiredStatement } from "./purgeExpired"
import { reserveKey } from "./reserveKey"
import { saveResponse } from "./saveResponse"

const NOW = 1_700_000_000_000
const base = { actorType: "customer", actorId: 7, key: "k-1", requestHash: "h-1" } as const

describeOnTargets("idempotency sorguları", (getDb) => {
  const platform = () => sqlitePlatform(getDb())

  it("aynı anahtar ikinci kez sahiplenilemez; yanıt yazılınca aynı yanıt döner", async () => {
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
    // yanıt bir kez yazılır
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

  it("farklı aktör aynı anahtarı ayrı sahiplenir; anonim 0 kullanır", async () => {
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

  it("süresi dolan anahtar yeniden sahiplenilir, süpürme siler", async () => {
    const p = platform()
    expect(await reserveKey(p, { ...base, ttlMs: 1000 }, NOW)).toBe(true)
    expect(await getResponse(p, base, NOW + 1001)).toBeNull()
    expect(await reserveKey(p, { ...base, requestHash: "h-2", ttlMs: 1000 }, NOW + 2000)).toBe(true)
    expect((await getResponse(p, base, NOW + 2000))?.requestHash).toBe("h-2")
    expect(await purgeExpired(p, NOW + 2500)).toBe(0)
    expect(await purgeExpired(p, NOW + 4000)).toBe(1)
    expect(await getResponse(p, base, NOW + 4000)).toBeNull()
  })

  it("süpürme sorgusu tam tarama yapmaz", () => {
    const p = platform()
    assertNoFullScan(getDb(), purgeExpiredStatement(p.db, NOW))
  })

  it("süpürme yalnız süresi dolanı siler", async () => {
    const p = platform()
    await reserveKey(p, { ...base, key: "k-short", ttlMs: 1000 }, NOW)
    await reserveKey(p, { ...base, key: "k-long" }, NOW)
    expect(await purgeExpired(p, NOW + 2000)).toBe(1)
    expect(await getResponse(p, { ...base, key: "k-long" }, NOW + 2000)).not.toBeNull()
  })
})
