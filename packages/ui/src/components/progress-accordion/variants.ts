import { cva } from "class-variance-authority"

// Medusa UI progress-accordion.tsx (MIT). `border-ui-border-base` → `border-border`.
export const progressAccordionItemVariants = cva("border-border border-b last-of-type:border-b-0")

export const progressAccordionHeaderVariants = cva(
  "h3-core text-foreground group flex w-full flex-1 items-center gap-4 px-6",
)

export const progressAccordionIndicatorVariants = cva(
  "text-fg-muted group-data-[state=open]:text-fg-interactive flex h-12 w-12 items-center justify-center",
)

export const progressAccordionContentVariants = cva([
  "overflow-hidden pl-[88px] pr-6",
  "data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
])
