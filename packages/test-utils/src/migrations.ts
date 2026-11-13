import { readFileSync } from "node:fs"
import { join } from "node:path"
import { orderMigrations } from "@openmers/db/migrator"
import { MIGRATIONS_DIR, migrationFiles } from "@openmers/db/testing"

export type Migration = { name: string; sql: string }

/** `packages/db/migrations/*.sql`, plan.ts sırasıyla. D1 hedefi (exec/batch) için; SQLite db'nin applyMigrations'ını kullanır. */
export function loadMigrations(dir = MIGRATIONS_DIR): Migration[] {
  return orderMigrations(migrationFiles(dir)).map((name) => ({
    name,
    sql: readFileSync(join(dir, name), "utf8"),
  }))
}
