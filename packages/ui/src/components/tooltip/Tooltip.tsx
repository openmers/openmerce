import { Tooltip as TooltipPrimitive } from "radix-ui"
import type { MouseEventHandler, ReactNode } from "react"
import { cn } from "../../utils/cn"
import { tooltipContentVariants } from "./variants"

type Props = {
  /** Tooltip body. */
  content: ReactNode
  children?: ReactNode
  /** Renders `children` as the trigger element instead of wrapping it in a button. */
  asChild?: boolean
  className?: string
  side?: "bottom" | "left" | "top" | "right"
  sideOffset?: number
  maxWidth?: number
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  delayDuration?: number
  skipDelayDuration?: number
  disabled?: boolean
  onClick?: MouseEventHandler<HTMLButtonElement>
}

export function Tooltip({
  content,
  children,
  asChild,
  className,
  side,
  sideOffset = 8,
  maxWidth = 220,
  open,
  defaultOpen,
  onOpenChange,
  delayDuration = 100,
  skipDelayDuration = 300,
  disabled,
  onClick,
}: Props) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration} skipDelayDuration={skipDelayDuration}>
      <TooltipPrimitive.Root
        open={disabled ? false : open}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
        delayDuration={delayDuration}
      >
        <TooltipPrimitive.Trigger asChild={asChild} onClick={onClick}>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            data-tooltip-content=""
            side={side}
            sideOffset={sideOffset}
            align="center"
            className={cn(tooltipContentVariants(), className)}
            style={{ maxWidth }}
          >
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
