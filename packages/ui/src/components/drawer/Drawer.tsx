import { X } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"
import type { ComponentProps, ReactNode } from "react"
import { cn } from "../../utils/cn"
import { IconButton } from "../icon-button"
import {
  drawerBodyVariants,
  drawerContentVariants,
  drawerFooterVariants,
  drawerHeaderVariants,
  drawerKbdVariants,
  drawerOverlayVariants,
} from "./variants"

export const Drawer = DialogPrimitive.Root
export const DrawerTrigger = DialogPrimitive.Trigger
export const DrawerClose = DialogPrimitive.Close
export const DrawerTitle = DialogPrimitive.Title

type ContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  overlayProps?: ComponentProps<typeof DialogPrimitive.Overlay>
}

export function DrawerContent({ className, overlayProps, ...rest }: ContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={drawerOverlayVariants()} {...overlayProps} />
      <DialogPrimitive.Content className={cn(drawerContentVariants(), className)} {...rest} />
    </DialogPrimitive.Portal>
  )
}

export function DrawerHeader({
  className,
  children,
}: {
  className?: string
  children?: ReactNode
}) {
  return (
    <div className={drawerHeaderVariants()}>
      <div className={cn("flex flex-col gap-y-1", className)}>{children}</div>
      <div className="flex items-center gap-x-2">
        <kbd className={drawerKbdVariants()}>esc</kbd>
        <DialogPrimitive.Close asChild>
          <IconButton size="small" type="button" variant="transparent" aria-label="Kapat">
            <X />
          </IconButton>
        </DialogPrimitive.Close>
      </div>
    </div>
  )
}

// The kit's default `Text` (size=base) is `txt-small`.
export function DrawerDescription({
  className,
  ...rest
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("txt-small", className)} {...rest} />
}

export function DrawerBody({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cn(drawerBodyVariants(), className)} {...rest} />
}

export function DrawerFooter({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cn(drawerFooterVariants(), className)} {...rest} />
}
