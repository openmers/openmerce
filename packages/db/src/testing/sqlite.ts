import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import Database from "better-sqlite3"
import { planMigrations } from "../migrator/plan.ts"

// Geçici yardımcı (bölüm A): packages/test-utils gelince oraya taşınır. node:fs yalnız burada.
// shortcut: Node çalıştırıcının (apps/api, bölüm B) yerine geçmez; yalnız test ve db:migrate:local.

export const MIGRATIONS_DIR = fileURLToPath(new URL("../../migrations", import.meta.url))

// wrangler d1 migrations ile aynı kayıt tablosu (biçim D1'de doğrulanacak, plan §1.3).
const D1_MIGRATIONS = `CREATE TABLE IF NOT EXISTS d1_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
)`

export function migrationFiles(dir = MIGRATIONS_DIR): string[] {
  return readdirSync(dir).filter((f) => f.endsWith(".sql"))
}

/** Bekleyen migration'ları uygular; her dosya ve kaydı tek transaction'da. Uygulananları döner. */
export function applyMigrations(db: Database.Database, dir = MIGRATIONS_DIR): string[] {
  db.exec(D1_MIGRATIONS)
  const applied = db.prepare("SELECT name FROM d1_migrations ORDER BY id").pluck().all() as string[]
  const pending = planMigrations(migrationFiles(dir), applied)
  const record = db.prepare("INSERT INTO d1_migrations (name) VALUES (?)")
  for (const name of pending) {
    const sql = readFileSync(join(dir, name), "utf8")
    db.transaction(() => {
      db.exec(sql)
      record.run(name)
    })()
  }
  return pending
}

/** Taze :memory: veritabanı, foreign_keys=ON, bütün migration'lar uygulanmış. */
export function openMigratedDb(filename = ":memory:"): Database.Database {
  const db = new Database(filename)
  db.pragma("foreign_keys = ON")
  applyMigrations(db)
  return db
}
