import type { ComponentProps } from "react"
import { cn } from "../../utils/cn"

export function Code({ className, ...rest }: ComponentProps<"code">) {
  return (
    <code
      className={cn(
        "txt-compact-small inline-flex rounded-md border border-tag-neutral-border bg-tag-neutral-bg px-[6px] font-mono text-tag-neutral-text",
        className,
      )}
      {...rest}
    />
  )
}
