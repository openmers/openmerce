import { cva } from "class-variance-authority"

// Ported from an MIT-licensed UI kit; see NOTICE. `after:bg-switch-off-hover-gradient` is absent from theme.css, so it was dropped.
export const switchVariants = cva(
  [
    "bg-bg-switch-off hover:bg-bg-switch-off-hover focus-visible:shadow-details-switch-background-focus data-[state=checked]:bg-bg-interactive disabled:opacity-50",
    "group relative inline-flex items-center rounded-full outline-hidden transition-all",
    "before:shadow-details-switch-background before:absolute before:inset-0 before:rounded-full before:content-['']",
    "after:absolute after:inset-0 after:rounded-full after:content-['']",
    "disabled:cursor-not-allowed",
  ],
  {
    variants: {
      size: {
        small: "h-[16px] w-[28px]",
        base: "h-[18px] w-[32px]",
      },
    },
    defaultVariants: {
      size: "base",
    },
  },
)

export const switchThumbVariants = cva(
  [
    "bg-fg-on-color shadow-details-switch-handle pointer-events-none rounded-full transition-all",
    "data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5",
  ],
  {
    variants: {
      size: {
        small: "h-[12px] w-[12px] data-[state=checked]:translate-x-3.5",
        base: "h-[14px] w-[14px] transition-transform",
      },
    },
    defaultVariants: {
      size: "base",
    },
  },
)

export type SwitchVariants = {
  size?: "small" | "base" | null | undefined
}
