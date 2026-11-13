import { getResponse, type IdempotencyActorType, reserveKey, saveResponse } from "@openmers/core"
import { ORPCError } from "@orpc/server"
import type { ApiContext } from "./base"

export const IDEMPOTENCY_HEADER = "idempotency-key"

export type IdempotencyScope = { actorType: IdempotencyActorType; actorId: number; key: string }

type Ctx = Pick<ApiContext, "platform" | "reqHeaders" | "now">

/** The `Idempotency-Key` header (8-200 chars); missing or malformed is `INVALID_INPUT`. */
export function requireIdempotencyKey(context: Pick<ApiContext, "reqHeaders">): string {
  const key = context.reqHeaders.get(IDEMPOTENCY_HEADER)?.trim() ?? ""
  if (key.length < 8 || key.length > 200) {
    throw new ORPCError("INVALID_INPUT", { message: "Idempotency-Key header required" })
  }
  return key
}

async function hash(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value) ?? "")
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

type Stored = { code?: string; message?: string }

async function replay<T>(context: Ctx, scope: IdempotencyScope, requestHash: string) {
  const prior = await getResponse(context.platform, scope, context.now)
  if (!prior) return null
  if (prior.requestHash !== requestHash) throw new ORPCError("IDEMPOTENCY_MISMATCH")
  if (prior.status !== "done") throw new ORPCError("CONFLICT", { message: "request in progress" })
  if (prior.responseStatus === 200) return { value: prior.response as T }
  const err = (prior.response ?? {}) as Stored
  throw new ORPCError(err.code ?? "INTERNAL", { message: err.message })
}

/**
 * `02-api-ve-istek-baglami` §3: the first request claims the key, runs and stores its response
 * (errors included); the same key with the same body replays it, with another body is
 * `IDEMPOTENCY_MISMATCH`, while still running is `CONFLICT`.
 */
export async function withIdempotency<T>(
  context: Ctx,
  scope: IdempotencyScope,
  body: unknown,
  run: () => Promise<T>,
): Promise<T> {
  const requestHash = await hash(body)
  const first = await replay<T>(context, scope, requestHash)
  if (first) return first.value
  if (!(await reserveKey(context.platform, { ...scope, requestHash }, context.now))) {
    const raced = await replay<T>(context, scope, requestHash)
    if (raced) return raced.value
    throw new ORPCError("CONFLICT", { message: "request in progress" })
  }
  const save = (responseStatus: number, response: unknown) =>
    saveResponse(context.platform, { ...scope, responseStatus, response }, context.now)
  try {
    const value = await run()
    await save(200, value)
    return value
  } catch (error) {
    // shortcut: unexpected errors are stored as INTERNAL too, so the key never stays stuck
    // `in_progress`; the client retries with a fresh key.
    const known = error instanceof ORPCError
    await save(known ? 400 : 500, {
      code: known ? error.code : "INTERNAL",
      message: known ? error.message : undefined,
    })
    throw error
  }
}
