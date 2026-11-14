import { createContext, useContext } from "react"

export type SelectSize = "base" | "small"

/** Carries the root `Select` size to the trigger. */
export const SelectSizeContext = createContext<SelectSize>("base")

export function useSelectSize(): SelectSize {
  return useContext(SelectSizeContext)
}
