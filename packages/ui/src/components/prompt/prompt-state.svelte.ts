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

let request = $state<PromptRequest | null>(null)

/** `PromptHost` is rendered once in the root layout; the request is kept in module state. */
export function getPromptRequest(): PromptRequest | null {
  return request
}

export function prompt(options: PromptOptions): Promise<boolean> {
  return new Promise((resolve) => {
    request = { ...options, resolve }
  })
}

export function settlePrompt(confirmed: boolean) {
  const active = request
  request = null
  active?.resolve(confirmed)
}
