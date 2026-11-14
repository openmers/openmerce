import type { ComponentProps } from "react"
import { cn } from "../../utils/cn"

export function Container({ className, ...rest }: ComponentProps<"div">) {
  return (
    <div
      className={cn("w-full rounded-lg bg-card px-6 py-4 shadow-elevation-card-rest", className)}
      {...rest}
    />
  )
}
