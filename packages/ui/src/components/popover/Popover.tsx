import { Popover as PopoverPrimitive } from "radix-ui"
import type { ComponentProps } from "react"
import { cn } from "../../utils/cn"
import { popoverContentVariants, popoverSeparatorVariants } from "./variants"

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger
export const PopoverClose = PopoverPrimitive.Close
/** Positions the content against another element instead of the trigger. */
export const PopoverAnchor = PopoverPrimitive.Anchor

export function PopoverContent({
  className,
  sideOffset = 8,
  side = "bottom",
  align = "start",
  ...rest
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-popover-content=""
        sideOffset={sideOffset}
        side={side}
        align={align}
        className={cn(popoverContentVariants(), className)}
        {...rest}
      />
    </PopoverPrimitive.Portal>
  )
}

export function PopoverSeparator({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cn(popoverSeparatorVariants(), className)} {...rest} />
}
