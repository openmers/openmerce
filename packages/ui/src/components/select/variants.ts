import { cva } from "class-variance-authority"
import type { SelectSize } from "./context"

// Ported from an MIT-licensed UI kit; see NOTICE. `bg-ui-bg-field` → `bg-bg-field`, `bg-ui-bg-disabled` → `bg-muted`.
export const selectTriggerVariants = cva(
  [
    "bg-bg-field shadow-buttons-neutral transition-fg flex w-full select-none items-center justify-between rounded-md outline-hidden",
    "data-[placeholder]:text-muted-foreground text-foreground",
    "hover:bg-bg-field-hover",
    "focus-visible:shadow-borders-interactive-with-active data-[state=open]:!shadow-borders-interactive-with-active",
    "aria-[invalid=true]:border-border-error aria-[invalid=true]:shadow-borders-error",
    "invalid:border-border-error invalid:shadow-borders-error",
    "disabled:!bg-muted disabled:!text-fg-disabled",
    "group/trigger",
  ],
  {
    variants: {
      size: {
        base: "h-8 px-2 py-1.5 txt-compact-small",
        small: "h-7 px-2 py-1 txt-compact-small",
      },
    },
    defaultVariants: {
      size: "base",
    },
  },
)

export const selectContentVariants = cva([
  "relative max-h-[200px] min-w-[var(--bits-floating-anchor-width)] overflow-hidden rounded-lg bg-popover text-foreground shadow-elevation-flyout",
  "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
  "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
  "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
])

export const selectViewportVariants = cva(
  "p-1 h-[var(--bits-floating-anchor-height)] w-full min-w-[var(--bits-floating-anchor-width)]",
)

export const selectLabelVariants = cva("txt-compact-xsmall-plus px-2 py-1.5 text-muted-foreground")

export const selectItemVariants = cva([
  "txt-compact-small grid cursor-pointer grid-cols-[15px_1fr] items-center gap-x-2 rounded-[4px] bg-popover px-2 py-1.5 outline-hidden transition-colors",
  "focus-visible:bg-bg-component-hover",
  "active:bg-bg-component-pressed",
  // bits-ui emits `data-selected` instead of Radix `data-state=checked`.
  "data-selected:txt-compact-small-plus",
  "disabled:text-fg-disabled",
])

// the kit's `bg-ui-border-component` token is absent from mapping.md; the separator only carries the menu edge colors.
export const selectSeparatorVariants = cva(
  "-mx-1 my-1 h-0.5 border-b border-t border-b-border-menu-bot border-t-border-menu-top",
)

export type { SelectSize }
