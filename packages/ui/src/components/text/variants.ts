import { cva, type VariantProps } from "class-variance-authority"

// Medusa UI text.tsx (MIT). Boyut + leading eşleşmesi compoundVariants ile aynen taşındı.
export const textVariants = cva("", {
  variants: {
    size: {
      xsmall: "",
      small: "",
      base: "",
      large: "",
      xlarge: "",
    },
    weight: {
      regular: "font-normal",
      plus: "font-medium",
    },
    family: {
      sans: "font-sans",
      mono: "font-mono",
    },
    leading: {
      normal: "",
      compact: "",
    },
  },
  defaultVariants: {
    family: "sans",
    size: "base",
    weight: "regular",
    leading: "normal",
  },
  compoundVariants: [
    { size: "xsmall", leading: "normal", className: "txt-xsmall" },
    { size: "xsmall", leading: "compact", className: "txt-compact-xsmall" },
    { size: "small", leading: "normal", className: "txt-small" },
    { size: "small", leading: "compact", className: "txt-compact-small" },
    { size: "base", leading: "normal", className: "txt-medium" },
    { size: "base", leading: "compact", className: "txt-compact-medium" },
    { size: "large", leading: "normal", className: "txt-large" },
    { size: "large", leading: "compact", className: "txt-compact-large" },
    { size: "xlarge", leading: "normal", className: "txt-xlarge" },
    { size: "xlarge", leading: "compact", className: "txt-compact-xlarge" },
  ],
})

export type TextVariants = VariantProps<typeof textVariants>
