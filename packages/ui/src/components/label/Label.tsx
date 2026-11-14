import type { ComponentProps } from "react"
import { cn } from "../../utils/cn"
import { type LabelVariants, labelVariants } from "./variants"

type Props = ComponentProps<"label"> & LabelVariants

export function Label({ className, size = "base", weight = "regular", ...rest }: Props) {
  // biome-ignore lint/a11y/noLabelWithoutControl: the consumer associates the control via htmlFor or children
  return <label className={cn(labelVariants({ size, weight }), className)} {...rest} />
}
