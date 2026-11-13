import { cva, type VariantProps } from "class-variance-authority"

// Ported from an MIT-licensed UI kit; see NOTICE. Uses a native <label> instead of Radix Label.Root;
// click-to-focus on the associated field comes from the browser's own label behavior.
export const labelVariants = cva("font-sans", {
  variants: {
    size: {
      xsmall: "txt-compact-xsmall",
      small: "txt-compact-small",
      base: "txt-compact-medium",
      large: "txt-compact-large",
    },
    weight: {
      regular: "font-normal",
      plus: "font-medium",
    },
  },
  defaultVariants: {
    size: "base",
    weight: "regular",
  },
})

export type LabelVariants = VariantProps<typeof labelVariants>
