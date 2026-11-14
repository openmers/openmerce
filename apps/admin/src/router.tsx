import { QueryClient } from "@tanstack/react-query"
import { createRouter, type RouterHistory } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"

export function createQueryClient() {
  // Admin data is never cached for long (correctness first); one retry hides transient blips.
  return new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 0 } } })
}

export function createAppRouter(queryClient: QueryClient, history?: RouterHistory) {
  return createRouter({ routeTree, context: { queryClient }, history, defaultPreload: "intent" })
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
