import { getContext, setContext } from "svelte"

export type SelectSize = "base" | "small"

const SELECT_SIZE = Symbol("SelectSize")

/** Carries the root `Select` size to the trigger; the `SelectContext` counterpart in Radix. */
export function setSelectSize(getSize: () => SelectSize) {
  setContext(SELECT_SIZE, getSize)
}

export function getSelectSize(): () => SelectSize {
  return (getContext<() => SelectSize>(SELECT_SIZE) ?? (() => "base")) as () => SelectSize
}
