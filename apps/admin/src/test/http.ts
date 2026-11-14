import { RPCSerializer } from "@orpc/client"
import { vi } from "vitest"

/** Thrown from a handler to answer with an oRPC error body, as the API's RPC handler does. */
export class ApiFail {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {}
}

type Handler = (input: unknown) => unknown
export type Call = { path: string; input: unknown; credentials?: RequestCredentials }

const serializer = new RPCSerializer()

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

/**
 * Replaces `fetch` at the HTTP boundary: `/rpc/admin/me` → `handlers["admin.me"]`. The wire format is
 * produced by oRPC's own serializer, so the real client decodes it. Unknown paths answer 404.
 */
export function mockApi(handlers: Record<string, Handler>) {
  const calls: Call[] = []
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const path = new URL(url, "http://admin.test").pathname
      .replace(/^\/rpc\//, "")
      .replace(/\//g, ".")
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined
    const input = body === undefined ? undefined : serializer.deserialize(body)
    calls.push({ path, input, credentials: init?.credentials })
    const handler = handlers[path]
    if (!handler) return json({ ok: false, code: "NOT_FOUND" }, 404)
    try {
      return json(serializer.serialize(await handler(input)), 200)
    } catch (error) {
      if (!(error instanceof ApiFail)) throw error
      const payload = { defined: false, code: error.code, message: error.code }
      return json(serializer.serialize(payload), error.status)
    }
  })
  vi.stubGlobal("fetch", fetchMock)
  return { calls, callsTo: (path: string) => calls.filter((call) => call.path === path) }
}

export const unauthenticated = () => {
  throw new ApiFail("UNAUTHENTICATED", 401)
}

export function me(permissions: string[]) {
  return () => ({ admin: { id: "adm_1", name: "Ada", email: "ada@example.com" }, permissions })
}
