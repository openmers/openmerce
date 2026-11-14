import { CircleExclamationPoint } from "lucide-react"
import type { ComponentProps } from "react"
import { cn } from "../../utils/cn"
import { type HintVariants, hintVariants } from "./variants"

type Props = ComponentProps<"span"> & HintVariants

export function Hint({ className, variant = "info", children, ...rest }: Props) {
  return (
    <span className={cn(hintVariants({ variant }), className)} {...rest}>
      {variant === "error" && (
        <div className="size-5 flex items-center justify-center">
          <CircleExclamationPoint className="size-5" aria-hidden="true" />
        </div>
      )}
      {children}
    </span>
  )
}
