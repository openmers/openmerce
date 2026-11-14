import type { ComponentProps } from "react"
import { cn } from "../../utils/cn"
import { type TextVariants, textVariants } from "./variants"

type Props = ComponentProps<"p"> &
  TextVariants & {
    as?: "p" | "span" | "div"
  }

export function Text({
  className,
  as: Tag = "p",
  size = "base",
  weight = "regular",
  family = "sans",
  leading = "normal",
  ...rest
}: Props) {
  return (
    <Tag className={cn(textVariants({ size, weight, family, leading }), className)} {...rest} />
  )
}
