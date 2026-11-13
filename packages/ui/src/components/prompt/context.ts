import { getContext, setContext } from "svelte"

export type PromptVariant = "danger" | "confirmation"

const PROMPT_VARIANT = Symbol("PromptVariant")

export function setPromptVariant(variant: () => PromptVariant) {
  setContext(PROMPT_VARIANT, variant)
}

export function getPromptVariant(): () => PromptVariant {
  return (getContext<() => PromptVariant>(PROMPT_VARIANT) ??
    (() => "danger")) as () => PromptVariant
}
