import { cva, type VariantProps } from "class-variance-authority"

// Medusa UI button.tsx (MIT). Yalnız theme.css'te karşılığı olan sınıflar taşındı;
// gradient `after:*` yardımcıları ve `shadow-buttons-colored` theme.css'te yok, çıkarıldı.
export const buttonVariants = cva(
  [
    "transition-fg relative inline-flex w-fit items-center justify-center overflow-hidden rounded-md outline-hidden",
    "disabled:bg-muted disabled:border-border disabled:text-fg-disabled disabled:shadow-buttons-neutral",
  ],
  {
    variants: {
      variant: {
        primary: [
          "shadow-buttons-inverted text-primary-foreground bg-primary",
          "hover:bg-button-inverted-hover",
          "active:bg-button-inverted-pressed",
          "focus-visible:!shadow-buttons-inverted-focus",
        ],
        secondary: [
          "shadow-buttons-neutral text-foreground bg-secondary",
          "hover:bg-button-neutral-hover",
          "active:bg-button-neutral-pressed",
          "focus-visible:shadow-buttons-neutral-focus",
        ],
        transparent: [
          "text-foreground bg-button-transparent",
          "hover:bg-button-transparent-hover",
          "active:bg-button-transparent-pressed",
          "focus-visible:shadow-buttons-neutral-focus focus-visible:bg-card",
          "disabled:!bg-transparent disabled:!shadow-none",
        ],
        danger: [
          "shadow-buttons-danger text-fg-on-color bg-destructive",
          "hover:bg-button-danger-hover",
          "active:bg-button-danger-pressed",
          "focus-visible:shadow-buttons-danger-focus",
        ],
      },
      size: {
        small: "txt-compact-small-plus gap-x-1.5 px-2 py-1",
        base: "txt-compact-small-plus gap-x-1.5 px-3 py-1.5",
        large: "txt-compact-medium-plus gap-x-1.5 px-4 py-2.5",
        xlarge: "txt-compact-large-plus gap-x-1.5 px-5 py-3.5",
      },
    },
    defaultVariants: {
      size: "base",
      variant: "primary",
    },
  },
)

export type ButtonVariants = VariantProps<typeof buttonVariants>
