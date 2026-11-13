import type Database from "better-sqlite3"
import { sqlitePlatform } from "../../../packages/core/src/features/__testing__/sqlitePlatform"

/** Core feature sorguları için gerçek SQLite üzerinde `Platform` yüzeyi. */
export const testPlatform = sqlitePlatform

/** Test içi tek satır okuma (sorgu sonucunu doğrulamak için). */
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
