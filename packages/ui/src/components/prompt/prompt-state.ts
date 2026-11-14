import type { PromptVariant } from "./context"

export type PromptOptions = {
  title: string
  description: string
  variant?: PromptVariant
  /** Text that must be typed to confirm destructive actions ("type the store name"). */
  verificationText?: string
  verificationInstruction?: string
  cancelText?: string
  confirmText?: string
}

type PromptRequest = PromptOptions & {
  resolve: (confirmed: boolean) => void
}

let request: PromptRequest | null = null
const listeners = new Set<() => void>()

function setRequest(next: PromptRequest | null) {
  request = next
  for (const listener of listeners) listener()
}

/** `PromptHost` is rendered once in the root layout; the request is kept in module state. */
export function getPromptRequest(): PromptRequest | null {
  return request
}

export function subscribePrompt(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function prompt(options: PromptOptions): Promise<boolean> {
  return new Promise((resolve) => {
    setRequest({ ...options, resolve })
  })
}

export function settlePrompt(confirmed: boolean) {
  const active = request
  setRequest(null)
  active?.resolve(confirmed)
}
