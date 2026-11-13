import { createRawSnippet } from "svelte"

/** Produces plain text/HTML instead of a `children` snippet in tests. */
export function textSnippet(html: string) {
  return createRawSnippet(() => ({ render: () => html }))
}
