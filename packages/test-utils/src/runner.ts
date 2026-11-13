import type Database from "better-sqlite3"
import { afterEach, beforeEach, describe } from "vitest"
import { openTestDb } from "./sqlite"

type Target = { name: string; open: () => Database.Database }

// Hedef eklemek yalnız bu listeye satır eklemektir; her hedef her testi kendi önekiyle kaydeder.
// shortcut: d1 hedefi yok, madde 4.13 — D1 kurulmadı; testler şimdilik yalnız sqlite'ta koşar.
// D1 eklendiğinde ortamda yoksa testi atlamamalı, kırmalı (plan §2.3).
const TARGETS: readonly Target[] = [{ name: "sqlite", open: () => openTestDb() }]

/** Aynı test gövdesini her hedefte taze veritabanıyla koşar; bağlantı her testten sonra kapanır. */
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
