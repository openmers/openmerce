import { cva } from "class-variance-authority"

// Medusa UI toast.tsx (MIT). `bg-ui-bg-component` → `bg-popover`, `text-ui-fg-subtle` → `text-muted-foreground`.
export const toastVariants = cva(
  "flex w-fit min-w-[360px] max-w-[440px] gap-x-3 overflow-hidden rounded-lg bg-popover p-3 shadow-elevation-flyout",
)

export const toastInnerVariants = cva("grid flex-1 items-center gap-x-2", {
  variants: {
    hasIcon: { true: "grid-cols-[20px_1fr]", false: "grid-cols-1" },
    hasDescription: { true: "items-start", false: "" },
  },
  defaultVariants: { hasIcon: true, hasDescription: false },
})

export const toastIconVariants = cva("flex size-5 items-center justify-center [&_svg]:size-5")

export const toastTitleVariants = cva("txt-compact-small-plus text-foreground")

export const toastDescriptionVariants = cva("txt-small text-pretty text-muted-foreground")

export const toastActionVariants = cva([
  "txt-compact-small-plus flex w-fit items-center rounded-[4px] bg-card text-foreground transition-colors",
  "focus-visible:shadow-borders-focus",
  "hover:text-muted-foreground",
  "disabled:text-fg-disabled",
])

export const toastActionDestructiveVariants = cva("text-fg-error")
