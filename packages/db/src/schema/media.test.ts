import type Database from "better-sqlite3"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { NOW, seeder } from "../testing/commerce"
import { openMigratedDb } from "../testing/sqlite"

// 0007_media: real better-sqlite3 :memory:, foreign_keys=ON, fresh DB per test.
let db: Database.Database
let s: ReturnType<typeof seeder>
beforeEach(() => {
  db = openMigratedDb()
  s = seeder(db)
})
afterEach(() => db.close())

describe("media", () => {
  it("indexes exist", () => {
    expect(s.indexSql("media_public_id_uq")).toMatch(/UNIQUE INDEX/)
    expect(s.indexSql("media_bucket_key_uq")).toMatch(/UNIQUE INDEX/)
    for (const idx of [
      "media_status_created_idx",
      "media_owner_idx",
      "digital_assets_variant_idx",
      "digital_assets_media_idx",
    ]) {
      expect(s.indexSql(idx), idx).toMatch(/INDEX/)
    }
  })

  it("(bucket, key) unique; status and bucket check", () => {
    s.media("a/1")
    expect(() => s.media("a/1")).toThrow(/UNIQUE constraint failed/)
    const insert = (status: string, bucket: string) =>
      s.run(
        `INSERT INTO media (public_id, status, bucket, key, created_at, updated_at)
         VALUES ('med_x', ?, ?, 'b/1', ?, ?)`,
        status,
        bucket,
        NOW,
        NOW,
      )
    expect(() => insert("done", "public")).toThrow(/media_status_ck/)
    expect(() => insert("ready", "cdn")).toThrow(/media_bucket_ck/)
  })

  it("used media is not deleted via NOT EXISTS, unused is deleted", () => {
    const used = s.media()
    const free = s.media()
    s.run(
      "INSERT INTO digital_assets (variant_id, media_id, version, created_at) VALUES (?, ?, 1, ?)",
      s.variant(s.product()),
      used,
      NOW,
    )
    const del = db.prepare(
      `DELETE FROM media WHERE id = ?
       AND NOT EXISTS (SELECT 1 FROM product_assets WHERE asset_id = media.id)
       AND NOT EXISTS (SELECT 1 FROM digital_assets WHERE media_id = media.id)`,
    )
    expect(del.run(used).changes).toBe(0)
    expect(del.run(free).changes).toBe(1)
  })
})
