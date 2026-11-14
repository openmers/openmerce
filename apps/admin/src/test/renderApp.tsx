import { QueryClient } from "@tanstack/react-query"
import { createMemoryHistory } from "@tanstack/react-router"
import { render } from "@testing-library/react"
import { App } from "../App"
import { createAppRouter } from "../router"

/** Renders the real router tree at `path` with a fresh query cache (no retries in tests). */
export function renderApp(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createAppRouter(queryClient, createMemoryHistory({ initialEntries: [path] }))
  return { router, ...render(<App queryClient={queryClient} router={router} />) }
}
