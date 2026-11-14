import type { ComponentProps } from "react"
import { cn } from "../../utils/cn"
import {
  type BadgeColorVariants,
  type BadgeSizeVariants,
  badgeColorVariants,
  badgeSizeVariants,
} from "./variants"

type Props = Omit<ComponentProps<"span">, "color"> & BadgeColorVariants & BadgeSizeVariants

export function Badge({ size, rounded, color, className, ...rest }: Props) {
  return (
    <span
      className={cn(badgeColorVariants({ color }), badgeSizeVariants({ size, rounded }), className)}
      {...rest}
    />
  )
}
