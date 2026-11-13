import type Database from "better-sqlite3"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { NOW, seeder } from "../testing/commerce"
import { openMigratedDb } from "../testing/sqlite"

// 0011_customers: real better-sqlite3 :memory:, foreign_keys=ON, fresh DB per test.
let db: Database.Database
let s: ReturnType<typeof seeder>
beforeEach(() => {
  db = openMigratedDb()
  s = seeder(db)
})
afterEach(() => db.close())

const user = (email: string, phone: string | null = null) =>
  s.run(
    `INSERT INTO users (name, email, phone_number, created_at, updated_at) VALUES ('U', ?, ?, ?, ?)`,
    email,
    phone,
    NOW,
    NOW,
  )
const session = (userId: number, customerId: number, token: string) =>
  s.run(
    `INSERT INTO sessions (user_id, token, expires_at, customer_id, group_ids, price_list_ids,
       session_version, created_at, updated_at) VALUES (?, ?, ?, ?, '[]', '[]', 0, ?, ?)`,
    userId,
    token,
    NOW,
    customerId,
    NOW,
    NOW,
  )
const address = (customerId: number, country = "DE") =>
  s.run(
    `INSERT INTO addresses (public_id, customer_id, address_line1, city, country, created_at, updated_at)
     VALUES (?, ?, 'Main St 1', 'Berlin', ?, ?, ?)`,
    `adr_${customerId}_${Math.random()}`,
    customerId,
    country,
    NOW,
    NOW,
  )

describe("sqlite_master", () => {
  it("unique and partial indexes exist", () => {
    expect(s.indexSql("customers_email_normalized_uq")).toMatch(/UNIQUE INDEX/)
    expect(s.indexSql("customers_user_uq")).toMatch(/WHERE "customers"."user_id" IS NOT NULL/)
    expect(s.indexSql("customers_deletion_idx")).toMatch(/WHERE .*deletion_requested_at/)
    expect(s.indexSql("users_phone_number_uq")).toMatch(/WHERE "users"."phone_number" IS NOT NULL/)
    expect(s.indexSql("sessions_token_uq")).toMatch(/UNIQUE INDEX/)
    expect(s.indexSql("customer_channels_channel_idx")).toMatch(/INDEX/)
  })
})

describe("users / sessions", () => {
  it("e-mail unique; phone unique only when set", () => {
    user("a@x.io", "+491")
    expect(() => user("a@x.io")).toThrow(/UNIQUE constraint failed: users.email/)
    user("b@x.io")
    user("c@x.io")
    expect(() => user("d@x.io", "+491")).toThrow(/UNIQUE constraint failed: users.phone_number/)
  })

  it("deleting a user removes sessions and accounts; customer FK required", () => {
    const u = user("a@x.io")
    const c = s.customer()
    session(u, c, "t1")
    expect(() => session(u, c, "t1")).toThrow(/UNIQUE constraint failed: sessions.token/)
    expect(() => session(u, 999, "t2")).toThrow(/FOREIGN KEY constraint failed/)
    s.run(
      `INSERT INTO accounts (user_id, provider_id, account_id, created_at, updated_at)
       VALUES (?, 'credential', '1', ?, ?)`,
      u,
      NOW,
      NOW,
    )
    s.run("DELETE FROM users WHERE id = ?", u)
    expect(db.prepare("SELECT count(*) FROM sessions").pluck().get()).toBe(0)
    expect(db.prepare("SELECT count(*) FROM accounts").pluck().get()).toBe(0)
  })

  it("company_role closed list; group ids are a JSON array", () => {
    const u = user("a@x.io")
    const c = s.customer()
    const id = session(u, c, "t1")
    expect(() => s.run("UPDATE sessions SET company_role = 'owner' WHERE id = ?", id)).toThrow(
      /sessions_company_role_ck/,
    )
    expect(() => s.run("UPDATE sessions SET group_ids = '{}' WHERE id = ?", id)).toThrow(
      /sessions_group_ids_ck/,
    )
  })
})

describe("customers", () => {
  it("one record per normalized e-mail", () => {
    s.customer("Ali@X.io")
    expect(() => s.customer(" ali@x.io")).toThrow(
      /UNIQUE constraint failed: customers.email_normalized/,
    )
  })

  it("an account binds to one customer; binding is conditional", () => {
    const u = user("a@x.io")
    const a = s.customer()
    const b = s.customer()
    const link = db.prepare("UPDATE customers SET user_id = ? WHERE id = ? AND user_id IS NULL")
    expect(link.run(u, a).changes).toBe(1)
    expect(link.run(u, a).changes).toBe(0)
    expect(() => link.run(u, b)).toThrow(/UNIQUE constraint failed: customers.user_id/)
  })

  it("status and source check; default address FK", () => {
    const c = s.customer()
    expect(() => s.run("UPDATE customers SET state = 'deleted' WHERE id = ?", c)).toThrow(
      /customers_state_ck/,
    )
    expect(() =>
      s.run("UPDATE customers SET default_shipping_address_id = 999 WHERE id = ?", c),
    ).toThrow(/FOREIGN KEY constraint failed/)
    const a = address(c)
    s.run("UPDATE customers SET default_shipping_address_id = ? WHERE id = ?", a, c)
  })

  it("conditional insert caps at 20 addresses", () => {
    const c = s.customer()
    const add = db.prepare(
      `INSERT INTO addresses (public_id, customer_id, address_line1, city, country, created_at, updated_at)
       SELECT ?, ?, 'x', 'y', 'DE', 0, 0 WHERE (SELECT count(*) FROM addresses WHERE customer_id = ?) < 20`,
    )
    for (let i = 0; i < 20; i++) expect(add.run(`adr_${i}`, c, c).changes).toBe(1)
    expect(add.run("adr_x", c, c).changes).toBe(0)
    expect(() => address(c, "DEU")).toThrow(/addresses_country_ck/)
  })

  it("list channel filter uses the index", () => {
    const detail = s.plan(
      "SELECT customer_id FROM customer_channels WHERE channel_id = ? ORDER BY customer_id",
      1,
    )
    expect(detail.join("\n")).toMatch(/customer_channels_channel_idx/)
    expect(detail.some((d) => /^SCAN customer_channels\b/.test(d))).toBe(false)
  })
})

describe("groups, notes, permissions", () => {
  it("duplicate group membership rejected; FK", () => {
    const g = s.run(
      `INSERT INTO customer_groups (public_id, name, kind, affects_commerce, created_at, updated_at)
       VALUES ('cgr_1', 'VIP', 'manual', 1, ?, ?)`,
      NOW,
      NOW,
    )
    const c = s.customer()
    const member = (customerId: number) =>
      s.run(
        "INSERT INTO customer_group_members (group_id, customer_id, source, added_at) VALUES (?, ?, 'manual', ?)",
        g,
        customerId,
        NOW,
      )
    member(c)
    expect(() => member(c)).toThrow(/UNIQUE constraint failed/)
    expect(() => member(999)).toThrow(/FOREIGN KEY constraint failed/)
  })

  it("admin-sourced permission requires a reason; status unique via PK", () => {
    const c = s.customer()
    const consent = (source: string, reason: string | null) =>
      s.run(
        `INSERT INTO consents (customer_id, channel, purpose, status, source, reason, created_at)
         VALUES (?, 'email', 'marketing', 'granted', ?, ?, ?)`,
        c,
        source,
        reason,
        NOW,
      )
    consent("checkout", null)
    expect(() => consent("admin", null)).toThrow(/consents_reason_ck/)
    consent("admin", "telefonla istedi")
    const state = () =>
      s.run(
        `INSERT INTO customer_consent_state (customer_id, channel, purpose, status, updated_at)
         VALUES (?, 'email', 'marketing', 'granted', ?)`,
        c,
        NOW,
      )
    state()
    expect(state).toThrow(/UNIQUE constraint failed/)
  })
})
