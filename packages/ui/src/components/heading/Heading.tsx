import type { ComponentProps } from "react"
import { cn } from "../../utils/cn"
import { type HeadingVariants, headingVariants } from "./variants"

type Props = ComponentProps<"h1"> & HeadingVariants

export function Heading({ level = "h1", className, ...rest }: Props) {
  const Tag = level ?? "h1"
  return <Tag className={cn(headingVariants({ level }), className)} {...rest} />
}
