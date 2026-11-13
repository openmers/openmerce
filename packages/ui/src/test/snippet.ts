import { createRawSnippet } from "svelte"

/** Testlerde `children` dilimi yerine düz metin/HTML üretir. */
export function textSnippet(html: string) {
  return createRawSnippet(() => ({ render: () => html }))
}
