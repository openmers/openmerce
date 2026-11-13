import { cva } from "class-variance-authority"

// Medusa UI time-input.tsx (MIT). `bg-ui-bg-field` → `bg-bg-field`.
export const timeInputVariants = cva(
  "txt-compact-small flex items-center rounded-md bg-bg-field px-2 py-1 shadow-borders-base",
  {
    variants: {
      isDisabled: {
        true: "text-fg-disabled cursor-not-allowed",
        false: "",
      },
    },
    defaultVariants: { isDisabled: false },
  },
)
