import type Database from "better-sqlite3"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { openMigratedDb } from "../testing/sqlite"

// 0003_admin_auth: gerçek better-sqlite3 :memory:, foreign_keys=ON, her test taze DB.
let db: Database.Database
beforeEach(() => {
  db = openMigratedDb()
})
afterEach(() => db.close())

const NOW = 1_700_000_000_000
const indexSql = (name: string) =>
  db.prepare("SELECT sql FROM sqlite_master WHERE type = 'index' AND name = ?").pluck().get(name) as
    | string
    | undefined
const run = (sql: string, ...args: unknown[]) => db.prepare(sql).run(...args).lastInsertRowid

const insertAdmin = (publicId: string, email: string) =>
  run(
    `INSERT INTO admin_users (public_id, name, email, status, created_at, updated_at)
     VALUES (?, 'A', ?, 'active', ?, ?)`,
    publicId,
    email,
    NOW,
    NOW,
  )
const insertRole = (code: string) =>
  run(
    "INSERT INTO roles (public_id, code, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    `rol_${code}`,
    code,
    code,
    NOW,
    NOW,
  )
const insertChannel = (code: string) =>
  run(
    `INSERT INTO channels (public_id, code, default_currency, currencies, langs, created_at, updated_at)
     VALUES (?, ?, 'USD', '["USD"]', '["en"]', ?, ?)`,
    `chn_${code}`,
    code,
    NOW,
    NOW,
  )
const assign = (adminId: number | bigint, roleId: number | bigint, channelId: unknown = null) =>
  run(
    `INSERT INTO admin_role_assignments (admin_user_id, role_id, channel_id, created_at)
     VALUES (?, ?, ?, ?)`,
    adminId,
    roleId,
    channelId,
    NOW,
  )
let policySeq = 0
const insertPolicy = (roleId: unknown, adminId: unknown, condition = "{}") =>
  run(
    `INSERT INTO access_policies (public_id, name, role_id, admin_id, resource, condition, active, created_at, updated_at)
     VALUES (?, 'p', ?, ?, 'orders', ?, 1, ?, ?)`,
    `acp_${++policySeq}`,
    roleId,
    adminId,
    condition,
    NOW,
    NOW,
  )

describe("sqlite_master", () => {
  it("benzersiz ve ifade indeksleri var", () => {
    for (const uq of [
      "admin_users_public_id_uq",
      "admin_users_email_uq",
      "admin_sessions_token_uq",
      "admin_accounts_provider_account_uq",
      "admin_two_factors_admin_user_uq",
      "admin_passkeys_credential_uq",
      "roles_public_id_uq",
      "roles_code_uq",
      "access_policies_public_id_uq",
    ]) {
      expect(indexSql(uq)).toMatch(/UNIQUE INDEX/)
    }
    for (const idx of [
      "admin_sessions_admin_user_idx",
      "admin_sessions_expires_idx",
      "admin_accounts_admin_user_idx",
      "admin_verifications_identifier_idx",
      "admin_verifications_expires_idx",
      "admin_passkeys_admin_user_idx",
      "admin_role_assignments_role_idx",
      "access_policies_role_idx",
      "access_policies_admin_idx",
    ]) {
      expect(indexSql(idx)).toMatch(/INDEX/)
    }
    expect(indexSql("admin_role_assignments_uq")).toMatch(
      /UNIQUE INDEX .*coalesce\(`channel_id`, 0\)/,
    )
  })
})

describe("admin_users", () => {
  it("çift public_id ve çift e-postayı reddeder", () => {
    insertAdmin("adm_1", "a@example.com")
    expect(() => insertAdmin("adm_1", "b@example.com")).toThrow(/admin_users.public_id/)
    expect(() => insertAdmin("adm_2", "a@example.com")).toThrow(/admin_users.email/)
  })

  it("geçersiz status reddedilir, Better Auth alanlarının varsayılanları uygulanır", () => {
    const id = insertAdmin("adm_1", "a@example.com")
    expect(db.prepare("SELECT * FROM admin_users WHERE id = ?").get(id)).toMatchObject({
      email_verified: 0,
      two_factor_enabled: 0,
      session_version: 0,
    })
    expect(() => run("UPDATE admin_users SET status = 'deleted' WHERE id = ?", id)).toThrow(
      /admin_users_status_ck/,
    )
  })
})

describe("admin_sessions / two_factors / passkeys", () => {
  it("FK: olmayan yöneticiye oturum açılamaz; yönetici silinince alt satırlar gider", () => {
    const session = (adminId: unknown, token: string) =>
      run(
        `INSERT INTO admin_sessions (admin_user_id, token, expires_at, session_version, permissions, created_at, updated_at)
         VALUES (?, ?, ?, 0, '{}', ?, ?)`,
        adminId,
        token,
        NOW,
        NOW,
        NOW,
      )
    expect(() => session(999, "t0")).toThrow(/FOREIGN KEY constraint failed/)
    const a = insertAdmin("adm_1", "a@example.com")
    session(a, "t1")
    expect(() => session(a, "t1")).toThrow(/admin_sessions.token/)
    run(
      "INSERT INTO admin_two_factors (admin_user_id, secret, backup_codes) VALUES (?, 's', 'c')",
      a,
    )
    expect(() =>
      run(
        "INSERT INTO admin_two_factors (admin_user_id, secret, backup_codes) VALUES (?, 's', 'c')",
        a,
      ),
    ).toThrow(/admin_two_factors.admin_user_id/)
    run("DELETE FROM admin_users WHERE id = ?", a)
    expect(db.prepare("SELECT count(*) FROM admin_sessions").pluck().get()).toBe(0)
    expect(db.prepare("SELECT count(*) FROM admin_two_factors").pluck().get()).toBe(0)
  })

  it("permissions JSON nesnesi olmalı", () => {
    const a = insertAdmin("adm_1", "a@example.com")
    expect(() =>
      run(
        `INSERT INTO admin_sessions (admin_user_id, token, expires_at, session_version, permissions, created_at, updated_at)
         VALUES (?, 't', ?, 0, '[]', ?, ?)`,
        a,
        NOW,
        NOW,
        NOW,
      ),
    ).toThrow(/admin_sessions_permissions_ck/)
  })
})

describe("roles / role_permissions / admin_role_assignments", () => {
  it("çift rol kodu ve çift izin reddedilir", () => {
    const r = insertRole("SuperAdmin")
    expect(() => insertRole("SuperAdmin")).toThrow(/roles\.(code|public_id)/)
    const perm = () =>
      run(
        "INSERT INTO role_permissions (role_id, permission, created_at) VALUES (?, 'orders:read', ?)",
        r,
        NOW,
      )
    perm()
    expect(perm).toThrow(/UNIQUE constraint failed: role_permissions/)
  })

  it("çift atama reddedilir; NULL kanal (tüm kanallar) de tekrar edemez", () => {
    const a = insertAdmin("adm_1", "a@example.com")
    const r = insertRole("editor")
    const c1 = insertChannel("b2c")
    const c2 = insertChannel("b2b")
    assign(a, r, c1)
    assign(a, r, c2)
    assign(a, r)
    expect(() => assign(a, r, c1)).toThrow(/UNIQUE constraint failed/)
    expect(() => assign(a, r)).toThrow(/UNIQUE constraint failed/)
  })

  it("FK: olmayan rol, yönetici ya da kanala atama reddedilir", () => {
    const a = insertAdmin("adm_1", "a@example.com")
    const r = insertRole("editor")
    expect(() => assign(a, 999)).toThrow(/FOREIGN KEY constraint failed/)
    expect(() => assign(999, r)).toThrow(/FOREIGN KEY constraint failed/)
    expect(() => assign(a, r, 999)).toThrow(/FOREIGN KEY constraint failed/)
  })
})

describe("access_policies", () => {
  it("role_id ve admin_id'den tam biri dolu olmalı", () => {
    const a = insertAdmin("adm_1", "a@example.com")
    const r = insertRole("editor")
    insertPolicy(r, null)
    insertPolicy(null, a)
    expect(() => insertPolicy(null, null)).toThrow(/access_policies_target_ck/)
    expect(() => insertPolicy(r, a)).toThrow(/access_policies_target_ck/)
  })

  it("condition JSON nesnesi, resource enum", () => {
    const r = insertRole("editor")
    expect(() => insertPolicy(r, null, "[]")).toThrow(/access_policies_condition_ck/)
    const id = insertPolicy(r, null)
    expect(() => run("UPDATE access_policies SET resource = 'invoices' WHERE id = ?", id)).toThrow(
      /access_policies_resource_ck/,
    )
  })
})
