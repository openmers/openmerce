import { cva } from "class-variance-authority"

export type ProgressStatus = "not-started" | "in-progress" | "completed"

// Ported from an MIT-licensed UI kit; see NOTICE. `bg-ui-bg-subtle` → `bg-background`, `bg-ui-bg-base` → `bg-card`.
export const progressTabsListVariants = cva("flex items-center")

export const progressTabsTriggerVariants = cva([
  "txt-compact-small-plus inline-flex h-[52px] w-full max-w-[200px] flex-1 items-center gap-x-2 border-r border-r-border bg-background px-4 text-left text-fg-muted outline-hidden transition-fg",
  "group/trigger overflow-hidden text-ellipsis whitespace-nowrap",
  "disabled:bg-muted disabled:text-fg-muted",
  "hover:bg-bg-subtle-hover",
  "focus:z-[1] focus-visible:bg-card",
  "data-[state=active]:bg-card data-[state=active]:text-foreground",
])

export const progressTabsIndicatorVariants = cva(
  "text-fg-muted group-data-[state=active]/trigger:text-fg-interactive",
)

export const progressTabsContentVariants = cva("outline-hidden")
