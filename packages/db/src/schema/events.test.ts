import type Database from "better-sqlite3"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { openMigratedDb } from "../testing/sqlite"

// 0005_events: gerçek better-sqlite3 :memory:, foreign_keys=ON, her test taze DB.
let db: Database.Database
beforeEach(() => {
  db = openMigratedDb()
})
afterEach(() => db.close())

const NOW = 1_700_000_000_000
const indexSql = (name: string) =>
  db.prepare("SELECT sql FROM sqlite_master WHERE type = 'index' AND name = ?").pluck().get(name) as
    | string
    | undefined
const run = (sql: string, ...args: unknown[]) => db.prepare(sql).run(...args).lastInsertRowid

let outboxSeq = 0
const insertOutbox = (
  kind: string,
  status: string,
  dedupeKey: string | null = null,
  publicId = `evt_${++outboxSeq}`,
) =>
  run(
    `INSERT INTO outbox (public_id, kind, payload, status, priority, next_attempt_at, dedupe_key, created_at, updated_at)
     VALUES (?, ?, '{}', ?, 1, ?, ?, ?, ?)`,
    publicId,
    kind,
    status,
    NOW,
    dedupeKey,
    NOW,
    NOW,
  )
const insertRun = (task: string, period: number) =>
  run(
    `INSERT INTO scheduled_runs (task, period, status, started_at, created_at, updated_at)
     VALUES (?, ?, 'running', ?, ?, ?)`,
    task,
    period,
    NOW,
    NOW,
    NOW,
  )
const insertRef = (source: string, externalId: string, connectionId?: string) =>
  run(
    `INSERT INTO external_refs (source, ${connectionId === undefined ? "" : "connection_id, "}entity_type, local_public_id, external_id, created_at, updated_at)
     VALUES (?, ${connectionId === undefined ? "" : "?, "}'product', 'prod_1', ?, ?, ?)`,
    ...[source, ...(connectionId === undefined ? [] : [connectionId]), externalId, NOW, NOW],
  )

describe("sqlite_master", () => {
  it("benzersiz ve kısmi indeksler var", () => {
    expect(indexSql("outbox_public_id_uq")).toMatch(/UNIQUE INDEX/)
    expect(indexSql("outbox_dedupe_uq")).toMatch(
      /UNIQUE INDEX .*WHERE .*status.* = 'pending' AND .*dedupe_key.* IS NOT NULL/,
    )
    for (const idx of [
      "outbox_claim_idx",
      "outbox_status_created_idx",
      "outbox_app_created_idx",
      "external_refs_local_idx",
    ]) {
      expect(indexSql(idx)).toMatch(/INDEX/)
    }
    expect(indexSql("scheduled_runs_task_period_uq")).toMatch(/UNIQUE INDEX/)
    expect(indexSql("external_refs_external_uq")).toMatch(/UNIQUE INDEX/)
  })
})

describe("outbox", () => {
  it("durum ve tür check'i, varsayılan attempts 0", () => {
    const id = insertOutbox("event", "pending")
    expect(db.prepare("SELECT attempts FROM outbox WHERE id = ?").pluck().get(id)).toBe(0)
    expect(() => insertOutbox("event", "queued")).toThrow(/outbox_status_ck/)
    expect(() => insertOutbox("job", "pending")).toThrow(/outbox_kind_ck/)
  })

  it("çift public_id reddedilir; payload JSON nesnesi", () => {
    insertOutbox("event", "pending", null, "evt_x")
    expect(() => insertOutbox("event", "pending", null, "evt_x")).toThrow(/outbox.public_id/)
    expect(() =>
      run(
        `INSERT INTO outbox (public_id, kind, payload, status, priority, next_attempt_at, created_at, updated_at)
         VALUES ('evt_y', 'event', '[]', 'pending', 1, ?, ?, ?)`,
        NOW,
        NOW,
        NOW,
      ),
    ).toThrow(/outbox_payload_ck/)
  })

  it("dedupe yalnız bekleyen satırlar arasında", () => {
    insertOutbox("reindex", "pending", "product:1")
    expect(() => insertOutbox("reindex", "pending", "product:1")).toThrow(
      /UNIQUE constraint failed/,
    )
    insertOutbox("reindex", "sent", "product:1")
    insertOutbox("import", "pending", "product:1")
    insertOutbox("reindex", "pending")
    insertOutbox("reindex", "pending")
  })
})

describe("scheduled_runs", () => {
  it("(task, period) benzersiz; ON CONFLICT DO NOTHING tek çalışma", () => {
    insertRun("outbox.sweep", NOW)
    insertRun("outbox.sweep", NOW + 300_000)
    expect(() => insertRun("outbox.sweep", NOW)).toThrow(/UNIQUE constraint failed/)
    const claim = db.prepare(
      `INSERT INTO scheduled_runs (task, period, status, started_at, created_at, updated_at)
       VALUES ('audit.seal', ?, 'running', ?, ?, ?) ON CONFLICT DO NOTHING`,
    )
    expect(claim.run(NOW, NOW, NOW, NOW).changes).toBe(1)
    expect(claim.run(NOW, NOW, NOW, NOW).changes).toBe(0)
  })

  it("geçersiz status reddedilir", () => {
    const id = insertRun("t", NOW)
    expect(() => run("UPDATE scheduled_runs SET status = 'pending' WHERE id = ?", id)).toThrow(
      /scheduled_runs_status_ck/,
    )
  })
})

describe("external_refs", () => {
  it("(source, connection_id, entity_type, external_id) benzersiz; connection_id varsayılanı ''", () => {
    insertRef("shopify", "1")
    expect(db.prepare("SELECT connection_id FROM external_refs").pluck().get()).toBe("")
    expect(() => insertRef("shopify", "1")).toThrow(/UNIQUE constraint failed/)
    expect(() => insertRef("shopify", "1", "")).toThrow(/UNIQUE constraint failed/)
    insertRef("shopify", "1", "store-b")
    insertRef("openmers.erp", "1")
  })
})
