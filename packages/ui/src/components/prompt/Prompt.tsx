import { AlertDialog as AlertDialogPrimitive } from "radix-ui"
import type { ComponentProps } from "react"
import { cn } from "../../utils/cn"
import { Button } from "../button"
import { type PromptVariant, PromptVariantContext, usePromptVariant } from "./context"
import {
  promptContentVariants,
  promptDescriptionVariants,
  promptFooterVariants,
  promptHeaderVariants,
  promptOverlayVariants,
} from "./variants"

type RootProps = ComponentProps<typeof AlertDialogPrimitive.Root> & {
  variant?: PromptVariant
}

export function Prompt({ variant = "danger", ...rest }: RootProps) {
  return (
    <PromptVariantContext value={variant}>
      <AlertDialogPrimitive.Root {...rest} />
    </PromptVariantContext>
  )
}

export const PromptTrigger = AlertDialogPrimitive.Trigger

type ContentProps = ComponentProps<typeof AlertDialogPrimitive.Content> & {
  overlayProps?: ComponentProps<typeof AlertDialogPrimitive.Overlay>
}

export function PromptContent({ className, overlayProps, ...rest }: ContentProps) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className={promptOverlayVariants()} {...overlayProps} />
      <AlertDialogPrimitive.Content className={cn(promptContentVariants(), className)} {...rest} />
    </AlertDialogPrimitive.Portal>
  )
}

export function PromptTitle({
  className,
  ...rest
}: ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title className={cn("text-foreground h2-core", className)} {...rest} />
  )
}

export function PromptDescription({
  className,
  ...rest
}: ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      className={cn(promptDescriptionVariants(), className)}
      {...rest}
    />
  )
}

export function PromptHeader({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cn(promptHeaderVariants(), className)} {...rest} />
}

export function PromptFooter({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cn(promptFooterVariants(), className)} {...rest} />
}

export function PromptAction(props: ComponentProps<typeof Button>) {
  const variant = usePromptVariant()
  return (
    <AlertDialogPrimitive.Action asChild>
      <Button size="small" variant={variant === "danger" ? "danger" : "primary"} {...props} />
    </AlertDialogPrimitive.Action>
  )
}

export function PromptCancel(props: ComponentProps<typeof Button>) {
  return (
    <AlertDialogPrimitive.Cancel asChild>
      <Button size="small" variant="secondary" {...props} />
    </AlertDialogPrimitive.Cancel>
  )
}
