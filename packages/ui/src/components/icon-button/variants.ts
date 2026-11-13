import { cva, type VariantProps } from "class-variance-authority"

// Medusa UI icon-button.tsx (MIT). theme.css'te olmayan sınıf eklenmedi.
export const iconButtonVariants = cva(
  [
    "transition-fg inline-flex w-fit items-center justify-center overflow-hidden rounded-md outline-hidden",
    "disabled:bg-muted disabled:shadow-buttons-neutral disabled:text-fg-disabled",
  ],
  {
    variants: {
      variant: {
        primary: [
          "shadow-buttons-neutral text-muted-foreground bg-secondary",
          "hover:bg-button-neutral-hover",
          "active:bg-button-neutral-pressed",
          "focus-visible:shadow-buttons-neutral-focus",
        ],
        transparent: [
          "text-muted-foreground bg-button-transparent",
          "hover:bg-button-transparent-hover",
          "active:bg-button-transparent-pressed",
          "focus-visible:shadow-buttons-neutral-focus focus-visible:bg-card",
          "disabled:!bg-transparent disabled:!shadow-none",
        ],
      },
      size: {
        "2xsmall": "h-5 w-5",
        xsmall: "h-6 w-6 p-1",
        small: "h-7 w-7 p-1",
        base: "h-8 w-8 p-1.5",
        large: "h-10 w-10 p-2.5",
        xlarge: "h-12 w-12 p-3.5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "base",
    },
  },
)

export type IconButtonVariants = VariantProps<typeof iconButtonVariants>
