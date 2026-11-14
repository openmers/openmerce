import { CircleCheck, CircleExclamationPoint, CircleX, Info, X } from "lucide-react"
import { type ComponentProps, useState } from "react"
import { cn } from "../../utils/cn"
import { IconButton } from "../icon-button"
import { alertIconVariants } from "./variants"

type Props = ComponentProps<"div"> & {
  variant?: "error" | "success" | "warning" | "info"
  dismissible?: boolean
}

const icons = {
  info: Info,
  error: CircleX,
  success: CircleCheck,
  warning: CircleExclamationPoint,
}

export function Alert({
  variant = "info",
  dismissible = false,
  className,
  children,
  ...rest
}: Props) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) {
    return null
  }
  const Icon = icons[variant]

  return (
    <div
      className={cn(
        "txt-compact-small grid items-start gap-x-2 text-pretty rounded-lg border bg-background p-3",
        dismissible ? "grid-cols-[20px_1fr_20px]" : "grid-cols-[20px_1fr]",
        className,
      )}
      {...rest}
    >
      <Icon className={alertIconVariants({ variant })} aria-hidden="true" />
      <div className="w-full">{children}</div>
      {dismissible && (
        <IconButton
          size="2xsmall"
          variant="transparent"
          type="button"
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
        >
          <X className="text-fg-muted" aria-hidden="true" />
        </IconButton>
      )}
    </div>
  )
}
