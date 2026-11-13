import { outbox } from "@openmers/db"
import { assertNoFullScan, describeOnTargets, openTestDb } from "@openmers/test-utils"
import { eq } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { sqlitePlatform } from "../../__testing__/sqlitePlatform"
import { nextAttemptDelay } from "../backoff"
import { enqueueStatement } from "../enqueueStatement"
import { claimBatch, dueCandidatesQuery } from "./claimBatch"
import { markFailed } from "./markFailed"
import { markSent } from "./markSent"
import { purgeSent, purgeSentStatement } from "./purgeSent"
import { requeueStuck, requeueStuckStatement } from "./requeueStuck"

const NOW = 1_700_000_000_000

function need<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`${what} yok`)
  return value
}

async function enqueue(
  p: ReturnType<typeof sqlitePlatform>,
  id: number,
  over: Partial<Parameters<typeof enqueueStatement>[1]> = {},
) {
  await p.atomic([
    enqueueStatement(
      p.db,
      { publicId: `evt_${id}`, kind: "notify", payload: { id }, ...over },
      NOW,
    ),
  ])
  return need(
    (
      await p.db
        .select()
        .from(outbox)
        .where(eq(outbox.publicId, `evt_${id}`))
    )[0],
    "outbox satırı",
  )
}

describeOnTargets("outbox sorguları", (getDb) => {
  const platform = () => sqlitePlatform(getDb())

  it("enqueueStatement tek başına yazmaz; iş ifadesi patlarsa satır kalmaz", async () => {
    const p = platform()
    const job = enqueueStatement(p.db, { publicId: "evt_a", kind: "notify", payload: {} }, NOW)
    expect(await getDb().prepare("SELECT count(*) FROM outbox").pluck().get()).toBe(0)

    await expect(
      p.atomic([
        job,
        enqueueStatement(p.db, { publicId: "evt_a", kind: "notify", payload: {} }, NOW),
      ]),
    ).rejects.toThrow(/UNIQUE/)
    expect(await p.db.select().from(outbox)).toHaveLength(0)
  })

  it("enqueue kind önceliğini ve varsayılan zamanı yazar; dedupe anahtarı birleştirir", async () => {
    const p = platform()
    const row = await enqueue(p, 1, { kind: "reindex", dedupeKey: "product:5" })
    expect(row).toMatchObject({
      status: "pending",
      attempts: 0,
      priority: 3,
      nextAttemptAt: NOW,
      dedupeKey: "product:5",
    })
    await p.atomic([
      enqueueStatement(
        p.db,
        { publicId: "evt_2", kind: "reindex", payload: {}, dedupeKey: "product:5" },
        NOW,
      ),
    ])
    expect(await p.db.select().from(outbox)).toHaveLength(1)
  })

  it("claimBatch yalnız vadesi gelenleri sahiplenir; ikinci çağrı kalanı alır", async () => {
    const p = platform()
    await enqueue(p, 1)
    await enqueue(p, 2)
    await enqueue(p, 3, { availableAt: NOW + 60_000 })

    const first = await claimBatch(p, { now: NOW, limit: 1 })
    expect(first).toHaveLength(1)
    expect(await claimBatch(p, { now: NOW, limit: 5 })).toHaveLength(1)
    const rows = await p.db.select().from(outbox)
    expect(rows.filter((r) => r.status === "sending")).toHaveLength(2)
    expect(rows.filter((r) => r.status === "pending")).toHaveLength(1)
  })

  it("markSent yalnız sahiplenilmiş satırı kapatır", async () => {
    const p = platform()
    const row = await enqueue(p, 1)
    expect(await markSent(p, row.id, NOW)).toBe(false)
    const [claimed] = await claimBatch(p, { now: NOW, limit: 1 })
    expect(await markSent(p, need(claimed, "sahiplenilen"), NOW + 1)).toBe(true)
    expect((await p.db.select().from(outbox))[0]?.status).toBe("sent")
    expect(await markSent(p, row.id, NOW + 2)).toBe(false)
  })

  it("markFailed denemeyi artırır, geri çekilir ve 10. denemede dead olur", async () => {
    const p = platform()
    const row = await enqueue(p, 1)
    let now = NOW
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      const [claimed] = await claimBatch(p, { now, limit: 1 })
      expect(need(claimed, "sahiplenilen")).toBe(row.id)
      expect(await markFailed(p, { id: row.id, error: `hata ${attempt}`, now })).toBe(true)
      const updated = need((await p.db.select().from(outbox))[0], "outbox satırı")
      expect(updated.attempts).toBe(attempt)
      if (attempt < 10) {
        expect(updated.status).toBe("failed")
        expect(updated.nextAttemptAt).toBe(now + nextAttemptDelay(attempt))
        now = updated.nextAttemptAt
      } else {
        expect(updated.status).toBe("dead")
        expect(updated.lastError).toBe("hata 10")
      }
    }
  })

  it("requeueStuck 5 dakikadan uzun sending satırı failed'a alır", async () => {
    const p = platform()
    await enqueue(p, 1)
    await enqueue(p, 2)
    await p.atomic([
      p.db
        .update(outbox)
        .set({ status: "sending", claimedAt: NOW - 299_999 })
        .where(eq(outbox.publicId, "evt_1"))
        .toSQL(),
      p.db
        .update(outbox)
        .set({ status: "sending", claimedAt: NOW - 300_001 })
        .where(eq(outbox.publicId, "evt_2"))
        .toSQL(),
    ])
    expect(await requeueStuck(p, { now: NOW })).toBe(1)
    const rows = await p.db.select().from(outbox)
    expect(rows.find((r) => r.publicId === "evt_1")?.status).toBe("sending")
    expect(rows.find((r) => r.publicId === "evt_2")?.status).toBe("failed")
  })

  it("purgeSent 7 günden eski sent satırları siler, bekleyenlere dokunmaz", async () => {
    const p = platform()
    await p.atomic([
      enqueueStatement(
        p.db,
        { publicId: "evt_old", kind: "notify", payload: {} },
        NOW - 604_800_000,
      ),
      enqueueStatement(p.db, { publicId: "evt_new", kind: "notify", payload: {} }, NOW - 1),
    ])
    await p.atomic([
      p.db.update(outbox).set({ status: "sent" }).where(eq(outbox.publicId, "evt_old")).toSQL(),
      p.db.update(outbox).set({ status: "sent" }).where(eq(outbox.publicId, "evt_new")).toSQL(),
    ])
    expect(await purgeSent(p, { now: NOW })).toBe(1)
    expect((await p.db.select().from(outbox)).map((r) => r.publicId)).toEqual(["evt_new"])
  })

  it("sahiplenme ve süpürme sorguları tam tarama yapmaz", async () => {
    const p = platform()
    assertNoFullScan(getDb(), dueCandidatesQuery(p.db, { now: NOW, limit: 10 }))
    assertNoFullScan(getDb(), purgeSentStatement(p.db, { now: NOW }))
    assertNoFullScan(getDb(), requeueStuckStatement(p.db, { now: NOW }))
  })
})

describe("[sqlite] outbox iki bağlantılı dosya modu", () => {
  it("iki tüketici aynı satırı sahiplenemez; sahiplenenler ayrık", async () => {
    const file = openTestDb({ file: true })
    try {
      const c1 = file.connect()
      const c2 = file.connect()
      c1.pragma("busy_timeout = 5000")
      c2.pragma("busy_timeout = 5000")
      const p1 = sqlitePlatform(c1)
      const p2 = sqlitePlatform(c2)
      await p1.atomic(
        [1, 2, 3].map((id) =>
          enqueueStatement(p1.db, { publicId: `evt_${id}`, kind: "notify", payload: {} }, NOW),
        ),
      )

      const [a, b] = await Promise.all([
        claimBatch(p1, { now: NOW, limit: 2 }),
        claimBatch(p2, { now: NOW, limit: 2 }),
      ])
      const claimed = [...a, ...b]
      expect(claimed.length).toBeGreaterThan(0)
      expect(new Set(claimed).size).toBe(claimed.length)
      // Aday okuması ile koşullu yazma arasında kaybeden taraf boş dönebilir; kalan bir sonraki turda alınır.
      const rest = await claimBatch(p1, { now: NOW, limit: 5 })
      expect([...claimed, ...rest].sort()).toEqual([1, 2, 3])
    } finally {
      file.close()
    }
  })
})
