import { cva } from "class-variance-authority"

// Medusa UI popover.tsx (MIT). Radix popper değişkenleri bits-ui karşılıklarına çevrildi.
export const popoverContentVariants = cva([
  "max-h-[var(--bits-floating-available-height)] min-w-[220px] overflow-hidden rounded-lg bg-card p-1 text-foreground shadow-elevation-flyout",
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
  "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
])

export const popoverSeparatorVariants = cva("-mx-1 my-1 h-px bg-border")
