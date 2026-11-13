import { defineHandlers, enqueueStatement, type Platform } from "@openmers/core"
import * as schema from "@openmers/db"
import { outbox } from "@openmers/db"
import { describeOnTargets } from "@openmers/test-utils"
import type Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { expect, it } from "vitest"
import { createNodePlatform } from "../platform/node"
import { createPoller, type Scheduler } from "./poller"

const NOW = 1_700_000_100_000

/** Gerçek saati beklemeden turları elle çalıştıran zamanlayıcı. */
function fakeScheduler() {
  let pending: (() => void | Promise<void>) | undefined
  const scheduler: Scheduler = {
    set(callback) {
      pending = callback
      return Symbol("timer")
    },
    clear() {
      pending = undefined
    },
  }
  return {
    scheduler,
    /** Kurulu zamanlayıcıyı bir kez çalıştırır ve turun bitmesini bekler. */
    async fire(): Promise<void> {
      const callback = pending
      pending = undefined
      await callback?.()
    },
    pending: () => pending !== undefined,
  }
}

/** Node `Platform`'u (madde 5.9) bellek içi bağlantıyla kurar; sürücü taklit edilmez. */
function nodePlatform(conn: Database.Database): Platform {
  const db = drizzle(conn, { schema })
  return createNodePlatform({
    sqlite: { write: conn, read: conn, db, readDb: db, close: () => undefined },
    now: () => NOW,
  })
}

describeOnTargets("poller", (getDb) => {
  it("sahte zamanlayıcıyla bir tur atar ve kapanır", async () => {
    const platform = nodePlatform(getDb())
    await platform.atomic([
      enqueueStatement(
        platform.db,
        { publicId: "evt_1", kind: "event", event: "order.placed", payload: {} },
        NOW,
      ),
    ])

    const fake = fakeScheduler()
    const poller = createPoller({
      platform,
      handlers: defineHandlers({ "order.placed": () => undefined }),
      scheduler: fake.scheduler,
      now: () => NOW,
      intervalMs: 10,
    })

    poller.start()
    expect(poller.isRunning()).toBe(true)
    await fake.fire()
    expect(await platform.db.select().from(outbox)).toMatchObject([{ status: "sent" }])
    // Tur bitince bir sonraki zamanlayıcı kurulur.
    expect(fake.pending()).toBe(true)

    await poller.stop()
    expect(poller.isRunning()).toBe(false)
    expect(fake.pending()).toBe(false)
  })

  it("tick() zamanlayıcı kurmaz, handler hatası turu düşürmez", async () => {
    const platform = nodePlatform(getDb())
    const fake = fakeScheduler()
    await platform.atomic([
      enqueueStatement(
        platform.db,
        { publicId: "evt_boom", kind: "event", event: "boom", payload: {} },
        NOW,
      ),
    ])
    const poller = createPoller({
      platform,
      handlers: defineHandlers({
        boom: () => {
          throw new Error("handler patladı")
        },
      }),
      scheduler: fake.scheduler,
      now: () => NOW,
    })

    const counters = await poller.tick()
    expect(counters).toEqual({ claimed: 1, sent: 0, failed: 1, dead: 0 })
    expect(fake.pending()).toBe(false)
    expect((await platform.db.select().from(outbox))[0]?.lastError).toBe("handler patladı")
  })
})
