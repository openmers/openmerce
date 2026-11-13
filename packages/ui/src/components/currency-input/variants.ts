import { cva, type VariantProps } from "class-variance-authority"

// Ported from an MIT-licensed UI kit; see NOTICE.
export const currencyInputVariants = cva(
  "flex items-center gap-x-1 bg-bg-field hover:bg-bg-field-hover shadow-buttons-neutral placeholder-fg-muted text-foreground transition-fg relative w-full rounded-md focus-within:shadow-borders-interactive-with-active",
  {
    variants: {
      size: {
        base: "txt-compact-medium h-8",
        small: "txt-compact-small h-7",
      },
    },
    defaultVariants: {
      size: "base",
    },
  },
)

export type CurrencyInputVariants = VariantProps<typeof currencyInputVariants>
