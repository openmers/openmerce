import { cva } from "class-variance-authority"

// Ported from an MIT-licensed UI kit; see NOTICE. `bg-ui-bg-base` → `bg-card`, `bg-ui-bg-base-hover` → `bg-accent`.
// Uses a bits-ui `Checkbox.Root` snippet instead of Radix `Indicator`.
export const checkboxVariants = cva(
  "group inline-flex h-5 w-5 items-center justify-center outline-hidden",
)

export const checkboxIndicatorVariants = cva([
  "flex h-[15px] w-[15px] items-center justify-center overflow-hidden rounded-[3px] bg-card text-fg-on-inverted shadow-borders-base transition-fg",
  "[&_path]:shadow-details-contrast-on-bg-interactive",
  "group-disabled:cursor-not-allowed group-disabled:opacity-50",
  "group-focus-visible:!shadow-borders-interactive-with-focus",
  "group-hover:group-enabled:group-data-[state=unchecked]:bg-accent",
  "group-data-[state=checked]:bg-bg-interactive group-data-[state=checked]:shadow-borders-interactive-with-shadow",
  "group-data-[state=indeterminate]:bg-bg-interactive group-data-[state=indeterminate]:shadow-borders-interactive-with-shadow",
])
