import type { PromptVariant } from "./context"

export type PromptOptions = {
  title: string
  description: string
  variant?: PromptVariant
  /** Yıkıcı eylemlerde onay için yazılması gereken metin ("mağaza adını yazın"). */
  verificationText?: string
  verificationInstruction?: string
  cancelText?: string
  confirmText?: string
}

type PromptRequest = PromptOptions & {
  resolve: (confirmed: boolean) => void
}

let request = $state<PromptRequest | null>(null)

/** `PromptHost` kök düzende bir kez render edilir; istek modül durumunda tutulur. */
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
