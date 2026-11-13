import { cva, type VariantProps } from "class-variance-authority"

// Medusa UI avatar.tsx (MIT). Radix Avatar yerine yerel img/fallback durumu kullanılıyor.
export const avatarVariants = cva(
  "flex shrink-0 items-center justify-center overflow-hidden shadow-borders-base bg-card",
  {
    variants: {
      variant: {
        squared: "",
        rounded: "rounded-full",
      },
      size: {
        "2xsmall": "h-5 w-5",
        xsmall: "h-6 w-6",
        small: "h-7 w-7",
        base: "h-8 w-8",
        large: "h-10 w-10",
        xlarge: "h-12 w-12",
      },
    },
    compoundVariants: [
      { variant: "squared", size: "2xsmall", className: "rounded" },
      { variant: "squared", size: "xsmall", className: "rounded-md" },
      { variant: "squared", size: "small", className: "rounded-md" },
      { variant: "squared", size: "base", className: "rounded-md" },
      { variant: "squared", size: "large", className: "rounded-lg" },
      { variant: "squared", size: "xlarge", className: "rounded-xl" },
    ],
    defaultVariants: {
      variant: "rounded",
      size: "base",
    },
  },
)

export const avatarInnerVariants = cva("aspect-square object-cover object-center", {
  variants: {
    variant: {
      squared: "",
      rounded: "rounded-full",
    },
    size: {
      "2xsmall": "txt-compact-xsmall-plus size-4",
      xsmall: "txt-compact-xsmall-plus size-5",
      small: "txt-compact-small-plus size-6",
      base: "txt-compact-small-plus size-7",
      large: "txt-compact-medium-plus size-9",
      xlarge: "txt-compact-large-plus size-11",
    },
  },
  compoundVariants: [
    { variant: "squared", size: "2xsmall", className: "rounded-xs" },
    { variant: "squared", size: "xsmall", className: "rounded" },
    { variant: "squared", size: "small", className: "rounded" },
    { variant: "squared", size: "base", className: "rounded" },
    { variant: "squared", size: "large", className: "rounded-md" },
    { variant: "squared", size: "xlarge", className: "rounded-[10px]" },
  ],
  defaultVariants: {
    variant: "rounded",
    size: "base",
  },
})

export type AvatarVariants = VariantProps<typeof avatarVariants>
export type AvatarInnerVariants = VariantProps<typeof avatarInnerVariants>
