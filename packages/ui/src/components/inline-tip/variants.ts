import { cva, type VariantProps } from "class-variance-authority"

// Ported from an MIT-licensed UI kit; see NOTICE.
export const inlineTipBarVariants = cva("bg-tag-neutral-icon h-full w-1 rounded-full", {
  variants: {
    variant: {
      info: "",
      warning: "bg-tag-orange-icon",
      error: "bg-tag-red-icon",
      success: "bg-tag-green-icon",
    },
  },
  defaultVariants: {
    variant: "info",
  },
})

export type InlineTipBarVariants = VariantProps<typeof inlineTipBarVariants>
