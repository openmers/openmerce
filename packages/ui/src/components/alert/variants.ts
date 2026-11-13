import { cva, type VariantProps } from "class-variance-authority"

// Medusa UI alert.tsx (MIT).
export const alertIconVariants = cva("size-5", {
  variants: {
    variant: {
      error: "text-tag-red-icon",
      success: "text-tag-green-icon",
      warning: "text-tag-orange-icon",
      info: "text-tag-neutral-icon",
    },
  },
  defaultVariants: {
    variant: "info",
  },
})

export type AlertIconVariants = VariantProps<typeof alertIconVariants>
