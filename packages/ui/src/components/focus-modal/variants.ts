import { cva } from "class-variance-authority"

// Ported from an MIT-licensed UI kit; see NOTICE. `bg-ui-bg-base` → `bg-card`, `border-ui-border-base` → `border-border`.
export const focusModalOverlayVariants = cva([
  "bg-bg-overlay fixed inset-0",
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
])

export const focusModalContentVariants = cva([
  "bg-card shadow-elevation-modal fixed inset-2 flex flex-col overflow-hidden rounded-lg border outline-hidden",
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-0 data-[state=closed]:slide-in-from-bottom-2 duration-200",
])

export const focusModalHeaderVariants = cva(
  "border-border flex items-center justify-between gap-x-4 border-b px-4 py-2",
)

export const focusModalFooterVariants = cva(
  "border-border flex items-center justify-end gap-x-2 border-t p-4",
)

export const focusModalBodyVariants = cva("flex-1")

export const focusModalKbdVariants = cva([
  "inline-flex h-5 w-fit min-w-[20px] items-center justify-center rounded-md px-1",
  "border border-tag-neutral-border bg-tag-neutral-bg text-tag-neutral-text",
  "txt-compact-xsmall-plus",
])
