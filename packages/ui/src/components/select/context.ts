import { getContext, setContext } from "svelte"

export type SelectSize = "base" | "small"

const SELECT_SIZE = Symbol("SelectSize")

/** Kök `Select` boyutu tetikleyiciye taşır; Radix'teki `SelectContext` karşılığı. */
export function setSelectSize(getSize: () => SelectSize) {
  setContext(SELECT_SIZE, getSize)
}

export function getSelectSize(): () => SelectSize {
  return (getContext<() => SelectSize>(SELECT_SIZE) ?? (() => "base")) as () => SelectSize
}
