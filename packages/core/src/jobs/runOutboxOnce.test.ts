import { outbox } from "@openmers/db"
import { describeOnTargets, openTestDb } from "@openmers/test-utils"
import { eq } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { sqlitePlatform } from "../features/__testing__/sqlitePlatform"
import { enqueueStatement, type OutboxJobInput } from "../features/outbox"
import { defineHandlers } from "./registry"
import { runOutboxOnce } from "./runOutboxOnce"

const NOW = 1_700_000_000_000

function need<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`${what} yok`)
  return value
}

async function enqueue(
  p: ReturnType<typeof sqlitePlatform>,
  publicId: string,
  over: Partial<OutboxJobInput> = {},
) {
  await p.atomic([
    enqueueStatement(p.db, { publicId, kind: "notify", payload: { id: publicId }, ...over }, NOW),
  ])
}

async function rows(p: ReturnType<typeof sqlitePlatform>) {
  return p.db.select().from(outbox)
}

async function rowBy(p: ReturnType<typeof sqlitePlatform>, publicId: string) {
  return need(
    (await p.db.select().from(outbox).where(eq(outbox.publicId, publicId)))[0],
    "outbox satırı",
  )
}

describeOnTargets("runOutboxOnce", (getDb) => {
  const platform = () => sqlitePlatform(getDb())

  it("hands the job to the handler and marks it sent", async () => {
    const p = platform()
    await enqueue(p, "evt_1", { kind: "event", event: "order.placed" })
    const seen: string[] = []
    const handlers = defineHandlers({
      "order.placed": (job) => {
        seen.push(job.publicId)
        expect(job.payload).toEqual({ id: "evt_1" })
      },
    })

    const counters = await runOutboxOnce(p, handlers, { now: NOW })
    expect(counters).toEqual({ claimed: 1, sent: 1, failed: 0, dead: 0 })
    expect(seen).toEqual(["evt_1"])
    expect(await rowBy(p, "evt_1")).toMatchObject({ status: "sent", attempts: 0, claimedAt: null })
  })

  it("a handler error increments attempts, other jobs are unaffected", async () => {
    const p = platform()
    await enqueue(p, "evt_bad", { kind: "event", event: "order.placed" })
    await enqueue(p, "evt_ok", { kind: "event", event: "order.placed" })
    const handlers = defineHandlers({
      "order.placed": (job) => {
        if (job.publicId === "evt_bad") throw new Error("sağlayıcı 500")
      },
    })

    const counters = await runOutboxOnce(p, handlers, { now: NOW, limit: 10 })
    expect(counters).toEqual({ claimed: 2, sent: 1, failed: 1, dead: 0 })
    expect(await rowBy(p, "evt_bad")).toMatchObject({
      status: "failed",
      attempts: 1,
      lastError: "sağlayıcı 500",
    })
    expect(await rowBy(p, "evt_ok")).toMatchObject({ status: "sent" })
  })

  it("an unknown topic becomes failed, not silently swallowed", async () => {
    const p = platform()
    await enqueue(p, "evt_1", { kind: "webhook", event: "app.unknown" })

    const counters = await runOutboxOnce(p, defineHandlers({}), { now: NOW })
    expect(counters).toEqual({ claimed: 1, sent: 0, failed: 1, dead: 0 })
    expect(await rowBy(p, "evt_1")).toMatchObject({
      status: "failed",
      attempts: 1,
      lastError: "UNKNOWN_TOPIC: app.unknown",
    })
  })

  it("a job kind without an event becomes the topic (kind if there is no event)", async () => {
    const p = platform()
    await enqueue(p, "evt_1", { kind: "reindex", payload: { product: "prod_1" } })
    const topics: string[] = []

    await runOutboxOnce(
      p,
      defineHandlers({
        reindex: (job) => {
          topics.push(job.topic)
        },
      }),
      { now: NOW },
    )
    expect(topics).toEqual(["reindex"])
  })

  it("becomes dead on the 10th attempt and writes a notification row", async () => {
    const p = platform()
    await enqueue(p, "evt_1", { kind: "event", event: "order.placed" })
    await p.atomic([
      p.db.update(outbox).set({ attempts: 9 }).where(eq(outbox.publicId, "evt_1")).toSQL(),
    ])

    const counters = await runOutboxOnce(
      p,
      defineHandlers({
        "order.placed": () => {
          throw new Error("kalıcı hata")
        },
      }),
      { now: NOW },
    )
    expect(counters).toEqual({ claimed: 1, sent: 0, failed: 0, dead: 1 })
    expect(await rowBy(p, "evt_1")).toMatchObject({
      status: "dead",
      attempts: 10,
      lastError: "kalıcı hata",
    })

    const notification = need(
      (await rows(p)).find((row) => row.kind === "notify" && row.event === "outbox.dead"),
      "bildirim satırı",
    )
    expect(notification).toMatchObject({ status: "pending", attempts: 0, priority: 0 })
    expect(notification.payload).toMatchObject({
      outbox_id: 1,
      topic: "order.placed",
      attempts: 10,
    })
  })

  it("counters are zero when there is no row to claim", async () => {
    const p = platform()
    const counters = await runOutboxOnce(p, defineHandlers({}), { now: NOW })
    expect(counters).toEqual({ claimed: 0, sent: 0, failed: 0, dead: 0 })
  })
})

describe("[sqlite] runOutboxOnce with two consumers", () => {
  it("does not process the same batch twice", async () => {
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
          enqueueStatement(
            p1.db,
            { publicId: `evt_${id}`, kind: "event", event: "order.placed", payload: { id } },
            NOW,
          ),
        ),
      )

      const handled: string[] = []
      const handlers = defineHandlers({
        "order.placed": (job) => {
          handled.push(job.publicId)
        },
      })
      await Promise.all([
        runOutboxOnce(p1, handlers, { now: NOW, limit: 3 }),
        runOutboxOnce(p2, handlers, { now: NOW, limit: 3 }),
      ])

      expect(new Set(handled).size).toBe(handled.length)
      const all = await p1.db.select().from(outbox)
      expect(all.filter((row) => row.status === "sent")).toHaveLength(handled.length)
      expect(handled.length).toBeGreaterThan(0)
    } finally {
      file.close()
    }
  })
})
