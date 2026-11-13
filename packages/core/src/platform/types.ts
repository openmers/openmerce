import type * as schema from "@openmers/db"
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core"
import type { AtomicResult, AtomicStatement } from "./atomic"
import type { Cache, Enqueue, Images, Purge, RateLimit, Storage } from "./ports"

/** Common type of the D1 (async) and better-sqlite3 (sync) Drizzle instances; core `await`s every call. */
export type Db = BaseSQLiteDatabase<"sync" | "async", unknown, typeof schema>

/** An array of rows; column names as in the database (snake_case). */
export type BatchRows = Record<string, unknown>[]

/** `apps/api` builds a single `Platform` for its target at startup; core only sees this (01-platform-arayuzu). */
export type Platform = {
  /** Write + consistent read. */
  db: Db
  /** Storefront reads: D1 read session / second read-only connection. */
  readDb: Db
  /** All or nothing; statements in order, conditional. Returns the number of rows affected by each statement. */
  atomic(stmts: readonly AtomicStatement[]): Promise<AtomicResult>
  /** Independent reads in one round trip (D1) / in order (self-host); rows in query order. */
  batch(queries: readonly AtomicStatement[]): Promise<BatchRows[]>
  storage: Storage
  cache: Cache
  purge: Purge
  enqueue: Enqueue
  rateLimit: RateLimit
  /** Without `kek` the vault is dormant (item 11). */
  secrets: { kek?: CryptoKey | string }
  /** Absent when there is no binding / `sharp`. */
  images?: Images
}
