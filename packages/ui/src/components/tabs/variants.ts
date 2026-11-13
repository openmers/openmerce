import { cva } from "class-variance-authority"

// Medusa UI tabs.tsx (MIT). `bg-ui-bg-base` → `bg-card`, `text-ui-fg-subtle` → `text-muted-foreground`.
export const tabsListVariants = cva("flex items-center gap-2")

export const tabsTriggerVariants = cva([
  "txt-compact-small-plus inline-flex items-center justify-center rounded-full border border-transparent bg-transparent px-2.5 py-1 text-muted-foreground outline-hidden transition-fg",
  "hover:text-foreground",
  "focus-visible:border-ring focus-visible:bg-card focus-visible:!shadow-borders-focus",
  "data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-elevation-card-rest",
  "disabled:text-fg-disabled",
])

export const tabsContentVariants = cva("outline-hidden")
