import { readFileSync } from "node:fs"
import { join } from "node:path"
import { orderMigrations } from "@openmers/db/migrator"
import { MIGRATIONS_DIR, migrationFiles } from "@openmers/db/testing"

export type Migration = { name: string; sql: string }

/** `packages/db/migrations/*.sql`, in plan.ts order. For the D1 target (exec/batch); SQLite reuses the db package's applyMigrations. */
export function loadMigrations(dir = MIGRATIONS_DIR): Migration[] {
  return orderMigrations(migrationFiles(dir)).map((name) => ({
    name,
    sql: readFileSync(join(dir, name), "utf8"),
  }))
}
