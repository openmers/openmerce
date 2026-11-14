import type { contract } from "@openmers/contract"
import { createORPCClient } from "@orpc/client"
import { RPCLink } from "@orpc/client/fetch"
import type { ContractRouterClient } from "@orpc/contract"
import { createTanstackQueryUtils } from "@orpc/tanstack-query"
import { channelHeaders } from "./channel"

export type ApiClient = ContractRouterClient<typeof contract>

const link = new RPCLink({
  url: (import.meta.env.VITE_API_BASE ?? "/rpc") as `/${string}`,
  headers: () => channelHeaders(),
  // Session cookie (`om_a`) travels with every call; JSON bodies need no extra CSRF header.
  fetch: (url, init) => globalThis.fetch(url, { ...init, credentials: "include" }),
})

/** Typed Admin API client (contract-only types; no server code in the bundle). */
export const api: ApiClient = createORPCClient(link)

/** TanStack Query helpers: `orpc.admin.products.list.queryOptions({ input })`. */
export const orpc = createTanstackQueryUtils(api)
