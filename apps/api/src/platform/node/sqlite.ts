import * as schema from "@openmers/db"
import Database from "better-sqlite3"
import { type BetterSQLite3Database, drizzle } from "drizzle-orm/better-sqlite3"

export type NodeSqlite = {
  /** The single write connection. */
  write: Database.Database
  /** Second, read-only connection (storefront reads). */
  read: Database.Database
  db: BetterSQLite3Database<typeof schema>
  readDb: BetterSQLite3Database<typeof schema>
  close(): void
}

// Performance §7: WAL, synchronous=NORMAL, busy_timeout, foreign_keys=ON. `path` must be a file;
// `:memory:` opens a separate database per connection.
export function openNodeSqlite(path: string, opts: { busyTimeoutMs?: number } = {}): NodeSqlite {
  const busy = `busy_timeout = ${opts.busyTimeoutMs ?? 5000}`
  const write = new Database(path)
  write.pragma("journal_mode = WAL")
  write.pragma("synchronous = NORMAL")
  write.pragma(busy)
  write.pragma("foreign_keys = ON")

  // WAL is persisted to the file; the read-only connection uses it.
  const read = new Database(path, { readonly: true })
  read.pragma(busy)
  read.pragma("foreign_keys = ON")

  return {
    write,
    read,
    db: drizzle(write, { schema }),
    readDb: drizzle(read, { schema }),
    close() {
      read.close()
      write.close()
    },
  }
}
