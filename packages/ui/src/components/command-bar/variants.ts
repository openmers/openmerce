import { cva } from "class-variance-authority"

// Medusa UI command-bar.tsx (MIT). `bg-ui-contrast-*` jetonları adlarını korur.
export const commandBarContentVariants = cva([
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
  "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
])

export const commandBarValueVariants = cva(
  "txt-compact-small-plus px-3 py-2.5 text-contrast-fg-secondary",
)

export const commandBarBarVariants = cva([
  "relative flex items-center overflow-hidden rounded-full bg-contrast-bg-base px-1",
  "after:pointer-events-none after:absolute after:inset-0 after:rounded-full after:shadow-elevation-flyout after:content-['']",
])

export const commandBarSeparatorVariants = cva("h-10 w-px bg-contrast-border-base")

export const commandBarCommandVariants = cva([
  "txt-compact-small-plus flex items-center gap-x-2 bg-contrast-bg-base px-3 py-2.5 text-primary-foreground outline-hidden transition-fg",
  "focus-visible:bg-contrast-bg-base-hover hover:bg-contrast-bg-base-hover focus-visible:hover:bg-contrast-bg-base-hover",
  "active:bg-contrast-bg-base-pressed focus-visible:active:bg-contrast-bg-base-pressed",
  "disabled:!bg-muted disabled:!text-fg-disabled",
  "last-of-type:-mr-1 last-of-type:pr-4",
])

export const commandBarKbdVariants = cva([
  "inline-flex h-5 w-fit min-w-[20px] items-center justify-center rounded-md px-1",
  "txt-compact-xsmall-plus border border-contrast-border-base bg-contrast-bg-subtle text-contrast-fg-secondary",
])
