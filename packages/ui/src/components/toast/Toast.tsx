import { CircleAlert, CircleCheck, CircleX, Info, LoaderCircle, X } from "lucide-react"
import type { ReactNode } from "react"
import { toast as sonnerToast } from "sonner"
import { cn } from "../../utils/cn"
import { IconButton } from "../icon-button"
import type { ToastActionProps, ToastVariant } from "./types"
import {
  toastActionDestructiveVariants,
  toastActionVariants,
  toastDescriptionVariants,
  toastIconVariants,
  toastInnerVariants,
  toastTitleVariants,
  toastVariants,
} from "./variants"

type Props = {
  id: string | number
  variant?: ToastVariant
  title: string
  description?: string
  action?: ToastActionProps
  icon?: ReactNode
  dismissable?: boolean
}

const icons: Record<ToastVariant, ReactNode> = {
  success: <CircleCheck className="text-tag-green-icon" />,
  warning: <CircleAlert className="text-tag-orange-icon" />,
  error: <CircleX className="text-tag-red-icon" />,
  loading: <LoaderCircle className="animate-spin text-tag-blue-icon" />,
  info: <Info className="text-foreground" />,
}

export function Toast({
  id,
  variant = "info",
  title,
  description,
  action,
  icon,
  dismissable = true,
}: Props) {
  return (
    <div className={toastVariants()} role="status" data-variant={variant}>
      <div className={toastInnerVariants({ hasIcon: true, hasDescription: Boolean(description) })}>
        <span className={toastIconVariants()} aria-hidden="true">
          {icon ?? icons[variant]}
        </span>
        <div className="flex flex-col gap-y-3">
          <div className="flex flex-col">
            <span className={toastTitleVariants()}>{title}</span>
            {description && <span className={toastDescriptionVariants()}>{description}</span>}
          </div>
          {action && (
            <button
              type="button"
              className={cn(
                toastActionVariants(),
                action.variant === "destructive" && toastActionDestructiveVariants(),
              )}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
      {dismissable && (
        <IconButton
          size="2xsmall"
          variant="transparent"
          type="button"
          aria-label="Bildirimi kapat"
          onClick={() => sonnerToast.dismiss(id)}
        >
          <X />
        </IconButton>
      )}
    </div>
  )
}
