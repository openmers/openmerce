import type { ComponentProps } from "react"
import { cn } from "../../utils/cn"

export function Kbd({ className, ...rest }: ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 w-fit min-w-[20px] items-center justify-center rounded-md border border-tag-neutral-border bg-tag-neutral-bg px-1 text-tag-neutral-text",
        "txt-compact-xsmall-plus",
        className,
      )}
      {...rest}
    />
  )
}
