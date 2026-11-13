import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { openMigratedDb } from "@openmers/db/testing"
import Database from "better-sqlite3"

export type TestDbFile = {
  path: string
  /** New independent connection to the same file (foreign_keys=ON). */
  connect(): Database.Database
  /** Closes every opened connection and removes the temp directory. */
  close(): void
}

// Migrations are applied once per test file; tests open a copy of this buffer.
let template: Buffer | undefined

function migratedTemplate(): Buffer {
  if (!template) {
    const db = openMigratedDb()
    try {
      template = db.serialize()
    } finally {
      db.close()
    }
  }
  return template
}

function withPragmas(db: Database.Database): Database.Database {
  db.pragma("foreign_keys = ON")
  return db
}

/**
 * Fresh database with all migrations applied. Default: an in-memory copy of the template.
 * `{ file: true }`: temp file, for race tests over two separate connections.
 */
export function openTestDb(): Database.Database
export function openTestDb(opts: { file: true }): TestDbFile
export function openTestDb(opts?: { file: true }): Database.Database | TestDbFile {
  if (!opts?.file) return withPragmas(new Database(migratedTemplate()))

  const dir = mkdtempSync(join(tmpdir(), "openmers-test-"))
  const path = join(dir, "test.sqlite")
  writeFileSync(path, migratedTemplate())
  const open: Database.Database[] = []
  return {
    path,
    connect() {
      const db = withPragmas(new Database(path))
      open.push(db)
      return db
    },
    close() {
      for (const db of open) db.close()
      rmSync(dir, { recursive: true, force: true })
    },
  }
}
