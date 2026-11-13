import { cva, type VariantProps } from "class-variance-authority"

// Ported from an MIT-licensed UI kit; see NOTICE.
export const statusBadgeVariants = cva(
  "flex items-center justify-center w-5 h-[18px] [&_div]:w-2 [&_div]:h-2 [&_div]:rounded-xs",
  {
    variants: {
      color: {
        green: "[&_div]:bg-tag-green-icon",
        red: "[&_div]:bg-tag-red-icon",
        orange: "[&_div]:bg-tag-orange-icon",
        blue: "[&_div]:bg-tag-blue-icon",
        purple: "[&_div]:bg-tag-purple-icon",
        grey: "[&_div]:bg-tag-neutral-icon",
      },
    },
    defaultVariants: {
      color: "grey",
    },
  },
)

export type StatusBadgeVariants = VariantProps<typeof statusBadgeVariants>
