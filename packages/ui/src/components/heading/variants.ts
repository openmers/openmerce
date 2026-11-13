import { cva, type VariantProps } from "class-variance-authority"

// Medusa UI heading.tsx (MIT).
export const headingVariants = cva("font-sans font-medium", {
  variants: {
    level: {
      h1: "h1-core",
      h2: "h2-core",
      h3: "h3-core",
    },
  },
  defaultVariants: {
    level: "h1",
  },
})

export type HeadingVariants = VariantProps<typeof headingVariants>
