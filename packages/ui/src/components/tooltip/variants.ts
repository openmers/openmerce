import { cva } from "class-variance-authority"

// Ported from an MIT-licensed UI kit; see NOTICE. `bg-ui-bg-base` → `bg-card`, `text-ui-fg-subtle` → `text-muted-foreground`.
export const tooltipContentVariants = cva([
  "txt-compact-xsmall text-muted-foreground bg-card shadow-elevation-tooltip rounded-lg px-2.5 py-1",
  "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
  "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
])
