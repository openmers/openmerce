import { outbox, scheduledRuns } from "@openmers/db"
import { describeOnTargets } from "@openmers/test-utils"
import { eq } from "drizzle-orm"
import { expect, it } from "vitest"
import { sqlitePlatform } from "../features/__testing__/sqlitePlatform"
import { enqueueStatement } from "../features/outbox"
import { MAINTENANCE_PERIOD_MS, MAINTENANCE_TASKS, runMaintenanceOnce } from "./runMaintenanceOnce"

// Dönem sınırı (5 dk'nın tam katı): dönem anahtarı hesabı testte sabit kalsın.
const NOW = 1_700_000_100_000

describeOnTargets("runMaintenanceOnce", (getDb) => {
  const platform = () => sqlitePlatform(getDb())

  it("dönem başına bir kez çalışır; aynı dönemde ikinci tetik iş yapmaz", async () => {
    const p = platform()
    await p.atomic([
      enqueueStatement(
        p.db,
        { publicId: "evt_old", kind: "notify", payload: {} },
        NOW - 604_800_000,
      ),
    ])
    await p.atomic([
      p.db.update(outbox).set({ status: "sent" }).where(eq(outbox.publicId, "evt_old")).toSQL(),
    ])

    const first = await runMaintenanceOnce(p, { now: NOW })
    expect(first.period).toBe(Math.floor(NOW / MAINTENANCE_PERIOD_MS) * MAINTENANCE_PERIOD_MS)
    expect(first.tasks.purgeSent).toEqual({ ran: true, affected: 1 })
    expect(first.tasks.requeueStuck.ran).toBe(true)
    expect(first.tasks.purgeIdempotency.ran).toBe(true)
    expect(await p.db.select().from(outbox)).toHaveLength(0)

    const second = await runMaintenanceOnce(p, { now: NOW + 1_000 })
    expect(second.tasks).toEqual({
      requeueStuck: { ran: false, affected: 0 },
      purgeSent: { ran: false, affected: 0 },
      purgeIdempotency: { ran: false, affected: 0 },
    })

    const runs = await p.db.select().from(scheduledRuns)
    expect(runs).toHaveLength(3)
    expect(runs.map((row) => row.task).sort()).toEqual(Object.values(MAINTENANCE_TASKS).sort())
    expect(runs.every((row) => row.status === "done" && row.finishedAt !== null)).toBe(true)
  })

  it("yeni dönemde yeniden çalışır", async () => {
    const p = platform()
    await runMaintenanceOnce(p, { now: NOW })
    const next = await runMaintenanceOnce(p, { now: NOW + MAINTENANCE_PERIOD_MS })
    expect(next.period).toBe(NOW + MAINTENANCE_PERIOD_MS)
    expect(next.tasks.purgeSent.ran).toBe(true)
    expect(await p.db.select().from(scheduledRuns)).toHaveLength(6)
  })

  it("takılı sending satırı geri alır", async () => {
    const p = platform()
    await p.atomic([
      enqueueStatement(p.db, { publicId: "evt_1", kind: "notify", payload: {} }, NOW),
    ])
    await p.atomic([
      p.db
        .update(outbox)
        .set({ status: "sending", claimedAt: NOW - 300_001 })
        .where(eq(outbox.publicId, "evt_1"))
        .toSQL(),
    ])

    const result = await runMaintenanceOnce(p, { now: NOW })
    expect(result.tasks.requeueStuck).toEqual({ ran: true, affected: 1 })
    expect((await p.db.select().from(outbox))[0]?.status).toBe("failed")
  })
})
