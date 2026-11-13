import type { DBAdapter, Where } from "better-auth/types"

// Better Auth 1.7.23 stores `session.token` in plain text and offers no hashing option (catalog decision 13).
// This wrapper sits between the adapter and Better Auth: when writing the session model it stores the
// token's SHA-256 hash, on lookup (`token` equality / `in`) it hashes the searched token, and puts the
// plain token back on returned rows (Better Auth signs that into the cookie). Only the hash is in the database;
// a hash from a stolen row is useless as a cookie (it gets hashed again and does not match).

const SESSION_MODELS = new Set(["session", "sessions", "adminSessions", "admin_sessions"])

export async function hashSessionToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

type Plain = Map<string, string>
type Row = Record<string, unknown> | null

async function hashValue(value: unknown, plain: Plain): Promise<unknown> {
  if (typeof value === "string") {
    const hashed = await hashSessionToken(value)
    plain.set(hashed, value)
    return hashed
  }
  if (Array.isArray(value)) return Promise.all(value.map((v) => hashValue(v, plain)))
  return value
}

async function hashWhere(where: Where[] | undefined, plain: Plain): Promise<Where[] | undefined> {
  if (!where) return where
  return Promise.all(
    where.map(async (w) =>
      w.field === "token" ? ({ ...w, value: await hashValue(w.value, plain) } as Where) : w,
    ),
  )
}

function restore<T>(row: T, plain: Plain): T {
  const r = row as Row
  if (!r || typeof r.token !== "string") return row
  const token = plain.get(r.token)
  return (token === undefined ? row : { ...r, token }) as T
}

type AnyAdapter = Omit<DBAdapter, "transaction"> & Partial<Pick<DBAdapter, "transaction">>

/** Wraps the adapter (and the in-transaction adapter) with a version that hashes session tokens. */
export function withHashedSessionTokens<A extends AnyAdapter>(inner: A): A {
  const own = (model: string) => SESSION_MODELS.has(model)
  // biome-ignore lint/suspicious/noExplicitAny: DBAdapter methods are generic; the wrapper is type-agnostic
  const a = inner as any
  const wrapped: AnyAdapter = {
    ...inner,
    async create(d) {
      const token = (d.data as Record<string, unknown>).token
      if (!own(d.model) || typeof token !== "string") return a.create(d)
      const plain: Plain = new Map()
      const data = { ...d.data, token: await hashValue(token, plain) }
      return restore(await a.create({ ...d, data }), plain)
    },
    async findOne(d) {
      if (!own(d.model)) return a.findOne(d)
      const plain: Plain = new Map()
      return restore(await a.findOne({ ...d, where: await hashWhere(d.where, plain) }), plain)
    },
    async findMany(d) {
      if (!own(d.model)) return a.findMany(d)
      const plain: Plain = new Map()
      const rows = await a.findMany({ ...d, where: await hashWhere(d.where, plain) })
      return rows.map((r: Row) => restore(r, plain))
    },
    async count(d) {
      return own(d.model)
        ? a.count({ ...d, where: await hashWhere(d.where, new Map()) })
        : a.count(d)
    },
    async update(d) {
      if (!own(d.model)) return a.update(d)
      const plain: Plain = new Map()
      const update =
        typeof d.update.token === "string"
          ? { ...d.update, token: await hashValue(d.update.token, plain) }
          : d.update
      return restore(
        await a.update({ ...d, update, where: await hashWhere(d.where, plain) }),
        plain,
      )
    },
    async updateMany(d) {
      if (!own(d.model)) return a.updateMany(d)
      return a.updateMany({ ...d, where: await hashWhere(d.where, new Map()) })
    },
    async delete(d) {
      if (!own(d.model)) return a.delete(d)
      return a.delete({ ...d, where: await hashWhere(d.where, new Map()) })
    },
    async deleteMany(d) {
      if (!own(d.model)) return a.deleteMany(d)
      return a.deleteMany({ ...d, where: await hashWhere(d.where, new Map()) })
    },
    async consumeOne(d) {
      if (!own(d.model)) return a.consumeOne(d)
      const plain: Plain = new Map()
      return restore(await a.consumeOne({ ...d, where: await hashWhere(d.where, plain) }), plain)
    },
    async incrementOne(d) {
      if (!own(d.model)) return a.incrementOne(d)
      const plain: Plain = new Map()
      return restore(await a.incrementOne({ ...d, where: await hashWhere(d.where, plain) }), plain)
    },
  }
  if (inner.transaction) {
    const transaction = inner.transaction
    wrapped.transaction = (cb) =>
      transaction((trx) => cb(withHashedSessionTokens(trx as AnyAdapter) as typeof trx))
  }
  return wrapped as A
}
