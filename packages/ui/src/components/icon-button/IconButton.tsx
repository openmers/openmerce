import { LoaderCircle } from "lucide-react"
import type { ComponentProps } from "react"
import { cn } from "../../utils/cn"
import { type IconButtonVariants, iconButtonVariants } from "./variants"

type Props = ComponentProps<"button"> &
  IconButtonVariants & {
    isLoading?: boolean
  }

export function IconButton({
  variant,
  size,
  className,
  isLoading = false,
  disabled,
  children,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      className={cn(iconButtonVariants({ variant, size }), className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading ? "true" : undefined}
    >
      {isLoading ? (
        <span className="pointer-events-none">
          <div className="absolute inset-0 flex items-center justify-center rounded-md bg-muted">
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          </div>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  )
}
