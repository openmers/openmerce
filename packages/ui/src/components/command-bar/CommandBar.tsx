import { Popover as PopoverPrimitive } from "radix-ui"
import { type ComponentProps, type ReactNode, useEffect } from "react"
import { cn } from "../../utils/cn"
import {
  commandBarBarVariants,
  commandBarCommandVariants,
  commandBarContentVariants,
  commandBarKbdVariants,
  commandBarSeparatorVariants,
  commandBarValueVariants,
} from "./variants"

type Props = {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children?: ReactNode
}

export function CommandBar({ open, defaultOpen = false, onOpenChange, children }: Props) {
  return (
    <PopoverPrimitive.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {/* An invisible fixed anchor keeps the bar at the bottom center of the viewport. */}
      <PopoverPrimitive.Anchor
        aria-hidden="true"
        className="fixed bottom-8 left-1/2 h-px w-px -translate-x-1/2"
      />
      <PopoverPrimitive.Content
        data-popover-content=""
        side="top"
        sideOffset={0}
        // The bar appears next to the page selection; it must not steal focus from it.
        onOpenAutoFocus={(event) => event.preventDefault()}
        className={commandBarContentVariants()}
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Root>
  )
}

export function CommandBarBar({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cn(commandBarBarVariants(), className)} {...rest} />
}

export function CommandBarValue({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cn(commandBarValueVariants(), className)} {...rest} />
}

export function CommandBarSeparator({
  className,
  ...rest
}: Omit<ComponentProps<"div">, "children">) {
  return <div className={cn(commandBarSeparatorVariants(), className)} {...rest} />
}

type CommandProps = Omit<ComponentProps<"button">, "onClick" | "children"> & {
  action: () => void | Promise<void>
  label: string
  shortcut: string
}

function isInputElement(element: Element | null) {
  if (!element) return false
  const tag = element.tagName
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    element.hasAttribute("contenteditable")
  )
}

export function CommandBarCommand({
  className,
  type = "button",
  label,
  action,
  shortcut,
  disabled,
  ...rest
}: CommandProps) {
  useEffect(() => {
    if (disabled) return
    function handleKeyDown(event: KeyboardEvent) {
      if (isInputElement(document.activeElement)) return
      if (event.key.toLowerCase() === shortcut.toLowerCase()) {
        event.preventDefault()
        event.stopPropagation()
        action()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [action, shortcut, disabled])

  return (
    <button
      className={cn(commandBarCommandVariants(), className)}
      type={type}
      onClick={action}
      disabled={disabled}
      {...rest}
    >
      <span>{label}</span>
      <kbd className={commandBarKbdVariants()}>{shortcut.toUpperCase()}</kbd>
    </button>
  )
}
