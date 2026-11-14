import { Check, ChevronRight, Ellipse } from "lucide-react"
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui"
import type { ComponentProps } from "react"
import { cn } from "../../utils/cn"
import {
  dropdownMenuCheckboxItemVariants,
  dropdownMenuContentVariants,
  dropdownMenuItemVariants,
  dropdownMenuLabelVariants,
  dropdownMenuRadioItemVariants,
  dropdownMenuSeparatorVariants,
  dropdownMenuShortcutVariants,
  dropdownMenuSubTriggerVariants,
} from "./variants"

export const DropdownMenu = DropdownMenuPrimitive.Root
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup
export const DropdownMenuSub = DropdownMenuPrimitive.Sub

export function DropdownMenuContent({
  className,
  sideOffset = 8,
  collisionPadding = 8,
  align = "center",
  ...rest
}: ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-dropdown-menu-content=""
        sideOffset={sideOffset}
        align={align}
        collisionPadding={collisionPadding}
        className={cn(dropdownMenuContentVariants(), className)}
        {...rest}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

export function DropdownMenuItem({
  className,
  ...rest
}: ComponentProps<typeof DropdownMenuPrimitive.Item>) {
  return (
    <DropdownMenuPrimitive.Item className={cn(dropdownMenuItemVariants(), className)} {...rest} />
  )
}

export function DropdownMenuCheckboxItem({
  className,
  children,
  ...rest
}: ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      className={cn(dropdownMenuCheckboxItemVariants(), className)}
      {...rest}
    >
      <span className="absolute left-2 flex size-[15px] items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
}

export function DropdownMenuRadioItem({
  className,
  children,
  ...rest
}: ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      className={cn(dropdownMenuRadioItemVariants(), className)}
      {...rest}
    >
      <span className="absolute left-2 flex size-[15px] items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Ellipse className="fill-foreground size-2" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  )
}

export function DropdownMenuLabel({
  className,
  ...rest
}: ComponentProps<typeof DropdownMenuPrimitive.Label>) {
  return (
    <DropdownMenuPrimitive.Label className={cn(dropdownMenuLabelVariants(), className)} {...rest} />
  )
}

export function DropdownMenuSeparator({
  className,
  ...rest
}: ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-dropdown-menu-separator=""
      className={cn(dropdownMenuSeparatorVariants(), className)}
      {...rest}
    />
  )
}

export function DropdownMenuShortcut({ className, ...rest }: ComponentProps<"span">) {
  return <span className={cn(dropdownMenuShortcutVariants(), className)} {...rest} />
}

export const DropdownMenuHint = DropdownMenuShortcut

export function DropdownMenuSubTrigger({
  className,
  children,
  ...rest
}: ComponentProps<typeof DropdownMenuPrimitive.SubTrigger>) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      className={cn(dropdownMenuSubTriggerVariants(), className)}
      {...rest}
    >
      {children}
      <ChevronRight className="text-muted-foreground ml-auto" />
    </DropdownMenuPrimitive.SubTrigger>
  )
}

export function DropdownMenuSubContent({
  className,
  collisionPadding = 8,
  ...rest
}: ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.SubContent
        collisionPadding={collisionPadding}
        className={cn(dropdownMenuContentVariants(), className)}
        {...rest}
      />
    </DropdownMenuPrimitive.Portal>
  )
}
