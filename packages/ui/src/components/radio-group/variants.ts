import { cva } from "class-variance-authority"

// Medusa UI radio-group.tsx (MIT). `bg-ui-bg-base` → `bg-card`, `bg-ui-bg-base-hover` → `bg-accent`.
export const radioGroupVariants = cva("grid gap-2")

export const radioGroupItemVariants = cva(
  "group relative flex h-5 w-5 items-center justify-center outline-hidden",
)

export const radioGroupIndicatorVariants = cva([
  "shadow-borders-base bg-card transition-fg flex h-[14px] w-[14px] items-center justify-center rounded-full",
  "group-hover:group-enabled:group-data-[state=unchecked]:bg-accent",
  "group-data-[state=checked]:bg-bg-interactive group-data-[state=checked]:shadow-borders-interactive-with-shadow",
  "group-focus-visible:!shadow-borders-interactive-with-focus",
  "group-disabled:cursor-not-allowed group-disabled:opacity-50",
])

export const radioGroupDotVariants = cva(
  "bg-card shadow-details-contrast-on-bg-interactive h-1.5 w-1.5 rounded-full",
)

export const radioGroupChoiceBoxVariants = cva([
  "shadow-borders-base bg-card focus-visible:shadow-borders-interactive-with-focus transition-fg group flex items-start gap-x-2 rounded-lg p-3 outline-hidden",
  "hover:enabled:bg-accent",
  "data-[state=checked]:shadow-borders-interactive-with-shadow",
  "group-disabled:cursor-not-allowed group-disabled:opacity-50",
])
