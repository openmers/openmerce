import type { CSSProperties } from "react"

/** Column sizes are optional kit extras; table-core types them only with the sizing feature. */
export function sizeStyle(def: object) {
  const { size, maxSize, minSize } = def as { size?: number; maxSize?: number; minSize?: number }
  const px = (n?: number) => (n === undefined ? undefined : `${n}px`)
  return {
    "--col-w": px(size),
    "--col-max": px(maxSize),
    "--col-min": px(minSize),
  } as CSSProperties
}
