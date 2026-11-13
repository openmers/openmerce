import { cva, type VariantProps } from "class-variance-authority"

// Ported from an MIT-licensed UI kit; see NOTICE.
export const hintVariants = cva("txt-small", {
  variants: {
    variant: {
      info: "text-muted-foreground",
      error: "text-fg-error grid grid-cols-[20px_1fr] gap-1 items-start",
    },
  },
  defaultVariants: {
    variant: "info",
  },
})

export type HintVariants = VariantProps<typeof hintVariants>
