import type Database from "better-sqlite3"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { openMigratedDb } from "../testing/sqlite"

// 0004_security: real better-sqlite3 :memory:, foreign_keys=ON, fresh DB per test.
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

const insertAdmin = () =>
  run(
    `INSERT INTO admin_users (public_id, name, email, status, created_at, updated_at)
     VALUES ('adm_1', 'A', 'a@example.com', 'active', ?, ?)`,
    NOW,
    NOW,
  )
const insertApiKey = (publicId: string, hash: string, adminId: unknown) =>
  run(
    `INSERT INTO api_keys (public_id, name, key_prefix, key_hash, permissions, created_by_admin_id, created_at, updated_at)
     VALUES (?, 'k', 'omk_abcdef', ?, '["orders:read"]', ?, ?, ?)`,
    publicId,
    hash,
    adminId,
    NOW,
    NOW,
  )
const insertSecret = (scope: string, scopeId: number, iv = Buffer.alloc(12)) =>
  run(
    `INSERT INTO secrets (scope, scope_id, key, ciphertext, iv, kek_version, created_at, updated_at)
     VALUES (?, ?, 'payment.stripe.secret_key', ?, ?, 1, ?, ?)`,
    scope,
    scopeId,
    Buffer.from("x"),
    iv,
    NOW,
    NOW,
  )
const insertIdem = (actorType: string, actorId: number, key: string, status = "in_progress") =>
  run(
    `INSERT INTO idempotency_keys (actor_type, actor_id, key, request_hash, status, expires_at, created_at, updated_at)
     VALUES (?, ?, ?, 'h', ?, ?, ?, ?)`,
    actorType,
    actorId,
    key,
    status,
    NOW,
    NOW,
    NOW,
  )
const insertAudit = (publicId: string, actorType = "admin") =>
  run(
    `INSERT INTO audit_log (public_id, actor_type, actor_id, action, created_at)
     VALUES (?, ?, 1, 'orders:write', ?)`,
    publicId,
    actorType,
    NOW,
  )

describe("sqlite_master", () => {
  it("unique and partial indexes exist", () => {
    for (const uq of [
      "secrets_scope_key_uq",
      "api_keys_public_id_uq",
      "api_keys_key_hash_uq",
      "channel_publishable_keys_public_id_uq",
      "channel_publishable_keys_key_hash_uq",
      "idempotency_keys_actor_key_uq",
      "audit_log_public_id_uq",
      "audit_anchors_day_uq",
    ]) {
      expect(indexSql(uq)).toMatch(/UNIQUE INDEX/)
    }
    for (const idx of [
      "channel_publishable_keys_channel_idx",
      "idempotency_keys_expires_idx",
      "audit_log_entity_idx",
      "audit_log_actor_idx",
      "audit_log_action_idx",
      "audit_log_created_idx",
    ]) {
      expect(indexSql(idx)).toMatch(/INDEX/)
    }
    expect(indexSql("audit_log_unsealed_idx")).toMatch(/WHERE .*row_hash.* IS NULL/)
  })
})

describe("secrets", () => {
  it("(scope, scope_id, key) unique; scope_id rule; IV 12 bytes", () => {
    insertSecret("global", 0)
    insertSecret("app_installation", 3)
    expect(() => insertSecret("global", 0)).toThrow(/UNIQUE constraint failed/)
    expect(() => insertSecret("channel", 0)).toThrow(/secrets_scope_id_ck/)
    expect(() => insertSecret("customer", 1)).toThrow(/secrets_scope_ck/)
    expect(() => insertSecret("channel", 1, Buffer.alloc(16))).toThrow(/secrets_iv_ck/)
  })
})

describe("api_keys", () => {
  it("duplicate public_id and duplicate key_hash rejected", () => {
    const a = insertAdmin()
    insertApiKey("apk_1", "h1", a)
    expect(() => insertApiKey("apk_1", "h2", a)).toThrow(/api_keys.public_id/)
    expect(() => insertApiKey("apk_2", "h1", a)).toThrow(/api_keys.key_hash/)
  })

  it("FK: missing admin rejected; permissions/channel_ids are JSON arrays", () => {
    expect(() => insertApiKey("apk_1", "h1", 999)).toThrow(/FOREIGN KEY constraint failed/)
    const id = insertApiKey("apk_1", "h1", insertAdmin())
    expect(() => run("UPDATE api_keys SET channel_ids = '{}' WHERE id = ?", id)).toThrow(
      /api_keys_channel_ids_ck/,
    )
    expect(() => run("UPDATE api_keys SET permissions = '\"x\"' WHERE id = ?", id)).toThrow(
      /api_keys_permissions_ck/,
    )
  })
})

describe("channel_publishable_keys", () => {
  it("duplicate key_hash and missing channel rejected; expires_at may be empty", () => {
    const channel = run(
      `INSERT INTO channels (public_id, code, default_currency, currencies, langs, created_at, updated_at)
       VALUES ('chn_a', 'a', 'USD', '["USD"]', '["en"]', ?, ?)`,
      NOW,
      NOW,
    )
    const key = (publicId: string, channelId: unknown, expiresAt: number | null = null) =>
      run(
        `INSERT INTO channel_publishable_keys (public_id, channel_id, key_prefix, key_hash, expires_at, created_at, updated_at)
         VALUES (?, ?, 'omp_abcdef', 'h1', ?, ?, ?)`,
        publicId,
        channelId,
        expiresAt,
        NOW,
        NOW,
      )
    key("cpk_1", channel, NOW + 86_400_000)
    expect(() => key("cpk_2", channel)).toThrow(/channel_publishable_keys.key_hash/)
    run("DELETE FROM channel_publishable_keys")
    expect(() => key("cpk_3", 999)).toThrow(/FOREIGN KEY constraint failed/)
  })
})

describe("idempotency_keys", () => {
  it("key + actor unique; a different actor may use the same key", () => {
    insertIdem("app", 1, "k1")
    insertIdem("app", 2, "k1")
    insertIdem("anonymous", 0, "k1")
    expect(() => insertIdem("app", 1, "k1")).toThrow(/UNIQUE constraint failed/)
  })

  it("invalid actor_type and status rejected", () => {
    expect(() => insertIdem("robot", 1, "k")).toThrow(/idempotency_keys_actor_type_ck/)
    expect(() => insertIdem("app", 1, "k", "failed")).toThrow(/idempotency_keys_status_ck/)
  })
})

describe("audit_log / audit_anchors", () => {
  it("seq follows rowid order, duplicate public_id and invalid actor rejected", () => {
    expect(insertAudit("aud_1")).toBe(1)
    expect(insertAudit("aud_2")).toBe(2)
    expect(() => insertAudit("aud_1")).toThrow(/audit_log.public_id/)
    expect(() => insertAudit("aud_3", "customer")).toThrow(/audit_log_actor_type_ck/)
  })

  it("one anchor per day", () => {
    const anchor = () =>
      run(
        `INSERT INTO audit_anchors (day, last_seq, last_hash, signature, created_at)
         VALUES (?, 1, 'h', 's', ?)`,
        NOW,
        NOW,
      )
    anchor()
    expect(anchor).toThrow(/audit_anchors.day/)
  })
})
