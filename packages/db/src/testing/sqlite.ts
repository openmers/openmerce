import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import Database from "better-sqlite3"
import { planMigrations } from "../migrator/plan.ts"

// Temporary helper (part A): moves to packages/test-utils once it exists. node:fs only here.
// shortcut: does not replace the Node runner (apps/api, part B); only tests and db:migrate:local.

export const MIGRATIONS_DIR = fileURLToPath(new URL("../../migrations", import.meta.url))

// same record table as wrangler d1 migrations (format verified on D1, plan §1.3).
const D1_MIGRATIONS = `CREATE TABLE IF NOT EXISTS d1_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
)`

export function migrationFiles(dir = MIGRATIONS_DIR): string[] {
  return readdirSync(dir).filter((f) => f.endsWith(".sql"))
}

/** Applies pending migrations; each file and its record in a single transaction. Returns the applied ones. */
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

/** Fresh :memory: database, foreign_keys=ON, all migrations applied. */
export function openMigratedDb(filename = ":memory:"): Database.Database {
  const db = new Database(filename)
  db.pragma("foreign_keys = ON")
  applyMigrations(db)
  return db
}
