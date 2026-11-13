import { cva, type VariantProps } from "class-variance-authority"

// Ported from an MIT-licensed UI kit; see NOTICE.
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
