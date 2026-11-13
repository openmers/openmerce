import { cva } from "class-variance-authority"

// Medusa UI date-segment.tsx (MIT). Radix/React Aria `segment.isPlaceholder` yerine boş değer kontrolü.
export const dateSegmentVariants = cva([
  "outline-hidden transition-fg",
  "focus-visible:bg-bg-interactive focus-visible:text-fg-on-color",
])

export const dateSegmentPlaceholderVariants = cva("uppercase text-muted-foreground")

export const dateSegmentLiteralVariants = cva("mx-1")
