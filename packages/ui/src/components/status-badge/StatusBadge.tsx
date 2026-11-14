import type { ComponentProps } from "react"
import { cn } from "../../utils/cn"
import { type StatusBadgeVariants, statusBadgeVariants } from "./variants"

type Props = Omit<ComponentProps<"span">, "color"> & StatusBadgeVariants

export function StatusBadge({ children, className, color = "grey", ...rest }: Props) {
  return (
    <span
      className={cn(
        "txt-compact-xsmall-plus box-border flex w-fit select-none items-center overflow-hidden rounded-md border border-border bg-background pl-0 pr-1 leading-none text-muted-foreground",
        className,
      )}
      {...rest}
    >
      <div role="presentation" className={statusBadgeVariants({ color })}>
        <div />
      </div>
      {children}
    </span>
  )
}
