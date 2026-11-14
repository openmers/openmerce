import { cva } from "class-variance-authority"

// Ported from an MIT-licensed UI kit; see NOTICE. `bg-ui-bg-component` → `bg-popover`, typography classes are unchanged.
const itemBase = [
  "bg-popover text-foreground txt-compact-small relative flex cursor-pointer select-none items-center rounded-md px-2 py-1.5 outline-hidden transition-colors",
  "focus-visible:bg-bg-component-hover focus:bg-bg-component-hover",
  "active:bg-bg-component-hover",
  "data-[disabled]:text-fg-disabled data-[disabled]:pointer-events-none",
]

export const dropdownMenuContentVariants = cva([
  "bg-popover text-foreground shadow-elevation-flyout max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[220px] overflow-hidden rounded-lg p-1",
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
  "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
])

export const dropdownMenuItemVariants = cva(itemBase)

export const dropdownMenuSubTriggerVariants = cva([
  ...itemBase,
  "data-[state=open]:!bg-bg-component-hover",
])

export const dropdownMenuCheckboxItemVariants = cva([
  "bg-popover text-foreground txt-compact-small relative flex cursor-pointer select-none items-center rounded-md py-1.5 pl-[31px] pr-2 outline-hidden transition-colors",
  "focus-visible:bg-bg-component-hover focus:bg-bg-component-hover",
  "active:bg-bg-component-hover",
  "data-[disabled]:text-fg-disabled data-[disabled]:pointer-events-none",
  "data-[state=checked]:txt-compact-small-plus",
])

export const dropdownMenuRadioItemVariants = cva([
  "bg-popover txt-compact-small relative flex cursor-pointer select-none items-center rounded-md py-1.5 pl-[31px] pr-2 outline-hidden transition-colors",
  "focus-visible:bg-bg-component-hover focus:bg-bg-component-hover",
  "active:bg-bg-component-hover",
  "data-[disabled]:text-fg-disabled data-[disabled]:pointer-events-none",
  "data-[state=checked]:txt-compact-small-plus",
])

export const dropdownMenuLabelVariants = cva("text-muted-foreground txt-compact-xsmall-plus")

export const dropdownMenuSeparatorVariants = cva(
  "border-t-border-menu-top border-b-border-menu-bot -mx-1 my-1 h-0.5 border-b border-t",
)

export const dropdownMenuShortcutVariants = cva(
  "text-muted-foreground txt-compact-small ml-auto tracking-widest",
)
