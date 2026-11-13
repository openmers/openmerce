import type Database from "better-sqlite3"
import { afterEach, beforeEach, describe } from "vitest"
import { openTestDb } from "./sqlite"

type Target = { name: string; open: () => Database.Database }

// Adding a target is just another entry here; each target registers every test with its own prefix.
// shortcut: no d1 target, item 4.13 — D1 is not set up; tests currently run on sqlite only.
// Once D1 is added, a missing environment must fail the test rather than skip it (plan §2.3).
const TARGETS: readonly Target[] = [{ name: "sqlite", open: () => openTestDb() }]

/** Runs the same test body on every target with a fresh database; the connection closes after each test. */
export function describeOnTargets(
  name: string,
  fn: (getDb: () => Database.Database) => void,
): void {
  for (const target of TARGETS) {
    describe(`[${target.name}] ${name}`, () => {
      let db: Database.Database | undefined
      beforeEach(() => {
        db = target.open()
      })
      afterEach(() => {
        db?.close()
        db = undefined
      })
      fn(() => {
        if (!db) throw new Error("getDb yalnız test içinde çağrılır")
        return db
      })
    })
  }
}
