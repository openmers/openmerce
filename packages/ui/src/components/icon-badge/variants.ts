import { cva, type VariantProps } from "class-variance-authority"

// Ported from an MIT-licensed UI kit; see NOTICE.
export const iconBadgeVariants = cva(
  "flex items-center justify-center overflow-hidden rounded-md border",
  {
    variants: {
      size: {
        base: "h-6 w-6",
        large: "h-7 w-7",
      },
    },
  },
)

export type IconBadgeVariants = VariantProps<typeof iconBadgeVariants>
