import { Check, ChevronsUpDown } from "lucide-react"
import { Select as SelectPrimitive } from "radix-ui"
import type { ComponentProps } from "react"
import { cn } from "../../utils/cn"
import { type SelectSize, SelectSizeContext, useSelectSize } from "./context"
import {
  selectContentVariants,
  selectItemVariants,
  selectLabelVariants,
  selectSeparatorVariants,
  selectTriggerVariants,
  selectViewportVariants,
} from "./variants"

export function Select({
  size = "base",
  ...rest
}: ComponentProps<typeof SelectPrimitive.Root> & { size?: SelectSize }) {
  return (
    <SelectSizeContext.Provider value={size}>
      <SelectPrimitive.Root {...rest} />
    </SelectSizeContext.Provider>
  )
}

export const SelectGroup = SelectPrimitive.Group
export const SelectValue = SelectPrimitive.Value

export function SelectTrigger({
  className,
  children,
  ...rest
}: ComponentProps<typeof SelectPrimitive.Trigger>) {
  const size = useSelectSize()
  return (
    <SelectPrimitive.Trigger className={cn(selectTriggerVariants({ size }), className)} {...rest}>
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronsUpDown className="text-muted-foreground group-disabled/trigger:text-fg-disabled" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

export function SelectContent({
  className,
  children,
  position = "popper",
  sideOffset = 8,
  collisionPadding = 24,
  ...rest
}: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-select-content=""
        position={position}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(selectContentVariants(), className)}
        {...rest}
      >
        <SelectPrimitive.Viewport className={selectViewportVariants()}>
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

export function SelectLabel({ className, ...rest }: ComponentProps<typeof SelectPrimitive.Label>) {
  return <SelectPrimitive.Label className={cn(selectLabelVariants(), className)} {...rest} />
}

export function SelectItem({
  className,
  children,
  ...rest
}: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-select-item=""
      className={cn(selectItemVariants(), className)}
      {...rest}
    >
      <span className="flex h-[15px] w-[15px] items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check />
        </SelectPrimitive.ItemIndicator>
      </span>
      <span className="flex-1 truncate">
        <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      </span>
    </SelectPrimitive.Item>
  )
}

export function SelectSeparator({
  className,
  ...rest
}: ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator className={cn(selectSeparatorVariants(), className)} {...rest} />
  )
}
