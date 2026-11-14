import type { ComponentProps } from "react"
import { cn } from "../../utils/cn"
import { type BadgeColorVariants, badgeColorVariants } from "../badge/variants"
import { type IconBadgeVariants, iconBadgeVariants } from "./variants"

type Props = Omit<ComponentProps<"span">, "color"> & BadgeColorVariants & IconBadgeVariants

export function IconBadge({ className, color = "grey", size = "base", ...rest }: Props) {
  return (
    <span
      className={cn(badgeColorVariants({ color }), iconBadgeVariants({ size }), className)}
      {...rest}
    />
  )
}
