import { X } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"
import type { ComponentProps, ReactNode } from "react"
import { cn } from "../../utils/cn"
import { IconButton } from "../icon-button"
import {
  focusModalBodyVariants,
  focusModalContentVariants,
  focusModalFooterVariants,
  focusModalHeaderVariants,
  focusModalKbdVariants,
  focusModalOverlayVariants,
} from "./variants"

export const FocusModal = DialogPrimitive.Root
export const FocusModalTrigger = DialogPrimitive.Trigger
export const FocusModalClose = DialogPrimitive.Close
export const FocusModalTitle = DialogPrimitive.Title

type ContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  overlayProps?: ComponentProps<typeof DialogPrimitive.Overlay>
}

export function FocusModalContent({ className, overlayProps, ...rest }: ContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={focusModalOverlayVariants()} {...overlayProps} />
      <DialogPrimitive.Content className={cn(focusModalContentVariants(), className)} {...rest} />
    </DialogPrimitive.Portal>
  )
}

export function FocusModalHeader({
  className,
  children,
}: {
  className?: string
  children?: ReactNode
}) {
  return (
    <div className={cn(focusModalHeaderVariants(), className)}>
      <div className="flex items-center gap-x-2">
        <DialogPrimitive.Close asChild>
          <IconButton size="small" type="button" variant="transparent" aria-label="Kapat">
            <X />
          </IconButton>
        </DialogPrimitive.Close>
        <kbd className={focusModalKbdVariants()}>esc</kbd>
      </div>
      {children}
    </div>
  )
}

export function FocusModalDescription({
  className,
  ...rest
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("txt-small", className)} {...rest} />
}

export function FocusModalBody({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cn(focusModalBodyVariants(), className)} {...rest} />
}

export function FocusModalFooter({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cn(focusModalFooterVariants(), className)} {...rest} />
}
