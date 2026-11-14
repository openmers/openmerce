import type { ComponentProps } from "react"
import { cn } from "../../utils/cn"

export function Skeleton({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cn("animate-pulse rounded-md bg-popover", className)} {...rest} />
}
