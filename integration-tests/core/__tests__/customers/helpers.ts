import type { CustomerAdminCtx } from "@openmers/core"
import type Database from "better-sqlite3"
import { sqlitePlatform } from "../../../../packages/core/src/features/__testing__/sqlitePlatform"
import { NOW, seedChannel } from "../catalog/helpers"

/** Real SQLite + default channel; the customer ctx carries an admin actor for group writes. */
export async function seedCustomers(conn: Database.Database) {
  const p = sqlitePlatform(conn)
  const channel = await seedChannel(p)
  const ctx: CustomerAdminCtx = {
    platform: p,
    now: NOW,
    requestId: "req_customers",
    actor: { type: "admin", id: undefined, permissions: new Set() },
  }
  const one = <T>(sql: string, ...params: unknown[]) =>
    conn
      .prepare(sql)
      .pluck()
      .get(...params) as T
  /** A Better Auth `users` row as sign-up writes it (verification flag set by the test). */
  const insertUser = (email: string, verified: boolean): number =>
    Number(
      conn
        .prepare(
          "INSERT INTO users (name, email, email_verified, created_at, updated_at) VALUES ('', ?, ?, ?, ?)",
        )
        .run(email, verified ? 1 : 0, NOW, NOW).lastInsertRowid,
    )
  return { p, channel, ctx, one, insertUser }
}
