import { cva } from "class-variance-authority"

// Ported from an MIT-licensed UI kit; see NOTICE. `bg-ui-bg-base` → `bg-card`, `text-ui-fg-subtle` → `text-muted-foreground`.
export const promptOverlayVariants = cva([
  "bg-bg-overlay fixed inset-0",
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
])

export const promptContentVariants = cva([
  "bg-card shadow-elevation-flyout fixed inset-0 m-auto flex h-fit w-full max-w-[400px] flex-col rounded-lg border focus-visible:outline-hidden",
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200",
])

export const promptDescriptionVariants = cva("text-muted-foreground txt-compact-medium")

export const promptHeaderVariants = cva("flex flex-col gap-y-1 px-6 pt-6")

export const promptFooterVariants = cva("flex items-center justify-end gap-x-2 p-6")

// The verification field uses the base classes of the kit's `Input` (it fell outside the B1 scope).
export const promptInputVariants = cva([
  "caret-foreground bg-bg-field hover:bg-bg-field-hover shadow-borders-base placeholder-muted-foreground text-foreground transition-fg relative w-full appearance-none rounded-md outline-hidden",
  "focus-visible:shadow-borders-interactive-with-active",
  "disabled:text-fg-disabled disabled:!bg-muted disabled:placeholder-fg-disabled disabled:cursor-not-allowed",
  "aria-[invalid=true]:!shadow-borders-error invalid:!shadow-borders-error",
  "txt-compact-small h-8 px-2 py-1.5",
])
