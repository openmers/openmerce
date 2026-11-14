import { createContext, useContext } from "react"

export type PromptVariant = "danger" | "confirmation"

export const PromptVariantContext = createContext<PromptVariant>("danger")

export function usePromptVariant(): PromptVariant {
  return useContext(PromptVariantContext)
}
