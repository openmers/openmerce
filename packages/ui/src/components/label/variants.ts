import { cva, type VariantProps } from "class-variance-authority"

// Medusa UI label.tsx (MIT). Radix Label.Root yerine yerel <label> kullanılıyor;
// tıklama ile ilişkili alanı odaklama davranışı tarayıcının kendi label davranışından gelir.
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
