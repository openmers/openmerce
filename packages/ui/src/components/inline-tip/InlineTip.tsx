import type { ComponentProps } from "react"
import { cn } from "../../utils/cn"
import { inlineTipBarVariants } from "./variants"

type Props = ComponentProps<"div"> & {
  label: string
  variant?: "info" | "warning" | "error" | "success"
}

export function InlineTip({ variant = "info", label, className, children, ...rest }: Props) {
  return (
    <div
      className={cn(
        "bg-popover txt-small text-muted-foreground grid grid-cols-[4px_1fr] items-start gap-3 rounded-lg border p-3",
        className,
      )}
      {...rest}
    >
      <div role="presentation" className={inlineTipBarVariants({ variant })} />
      <div className="text-pretty">
        <strong className="txt-small-plus text-foreground">{label}:</strong> {children}
      </div>
    </div>
  )
}
