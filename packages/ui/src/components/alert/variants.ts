import { cva, type VariantProps } from "class-variance-authority"

// Ported from an MIT-licensed UI kit; see NOTICE.
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
