import { cva } from "class-variance-authority"

// Ported from an MIT-licensed UI kit; see NOTICE. An empty-value check replaces Radix/React Aria `segment.isPlaceholder`.
export const dateSegmentVariants = cva([
  "outline-hidden transition-fg",
  "focus-visible:bg-bg-interactive focus-visible:text-fg-on-color",
])

export const dateSegmentPlaceholderVariants = cva("uppercase text-muted-foreground")

export const dateSegmentLiteralVariants = cva("mx-1")
