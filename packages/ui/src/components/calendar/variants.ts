import { cva } from "class-variance-authority"

// Medusa UI calendar.tsx (MIT). `bg-ui-bg-field` → `bg-bg-field`, `bg-ui-bg-base` → `bg-card`,
// `bg-ui-bg-interactive` → `bg-bg-interactive`, `bg-ui-bg-base-hover` → `bg-accent`.
export const calendarVariants = cva("flex flex-col gap-y-2")

export const calendarHeaderVariants = cva(
  "bg-bg-field border-border grid grid-cols-[28px_1fr_28px] items-center gap-1 rounded-md border p-0.5",
)

export const calendarButtonVariants = cva("rounded-[4px]")

export const calendarHeadingVariants = cva("txt-compact-small-plus text-center")

export const calendarHeadCellVariants = cva(
  "txt-compact-small-plus text-muted-foreground size-8 rounded-md p-1",
)

export const calendarCellVariants = cva("p-1")

export const calendarDayVariants = cva([
  "bg-card txt-compact-small relative flex size-8 items-center justify-center rounded-md border border-transparent outline-hidden transition-fg",
  "hover:bg-accent",
  "focus-visible:shadow-borders-focus focus-visible:border-ring",
  "data-[selected]:!bg-bg-interactive data-[selected]:!text-fg-on-color",
  "data-[disabled]:text-muted-foreground data-[disabled]:hover:!bg-card data-[disabled]:cursor-default",
  "data-[unavailable]:text-muted-foreground data-[unavailable]:hover:!bg-card data-[unavailable]:cursor-default",
])

export const calendarTodayDotVariants = cva(
  "bg-bg-interactive absolute bottom-[3px] left-1/2 size-[3px] -translate-x-1/2 rounded-full transition-fg",
)

export const calendarTodayDotSelectedVariants = cva("bg-fg-on-color")
