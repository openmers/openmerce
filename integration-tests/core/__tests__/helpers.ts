import type Database from "better-sqlite3"
import { sqlitePlatform } from "../../../packages/core/src/features/__testing__/sqlitePlatform"

/** `Platform` surface on real SQLite for core feature queries. */
export const testPlatform = sqlitePlatform

/** Reads a single row inside a test (to verify a query result). */
export function scalar<T>(
  conn: Database.Database,
  sql: string,
  ...params: unknown[]
): T | undefined {
  return conn
    .prepare(sql)
    .pluck()
    .get(...params) as T | undefined
}
