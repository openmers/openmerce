import { cva } from "class-variance-authority"

// Medusa UI drawer.tsx (MIT). `bg-ui-bg-base` → `bg-card`, `border-ui-border-base` → `border-border`.
export const drawerOverlayVariants = cva([
  "bg-bg-overlay fixed inset-0",
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
])

export const drawerContentVariants = cva([
  "bg-card shadow-elevation-modal border-border fixed inset-y-2 flex w-full flex-1 flex-col rounded-lg border outline-hidden",
  "max-sm:inset-x-2 max-sm:w-[calc(100%-16px)] sm:right-2 sm:max-w-[560px]",
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right-1/2 data-[state=open]:slide-in-from-right-1/2 duration-200",
])

export const drawerHeaderVariants = cva(
  "border-border flex items-start justify-between gap-x-4 border-b px-6 py-4",
)

export const drawerBodyVariants = cva("flex-1 px-6 py-4")

export const drawerFooterVariants = cva(
  "border-border flex items-center justify-end gap-x-2 overflow-y-auto border-t px-6 py-4",
)

// `Kbd` bileşeni B1 kapsamında; drawer başlığı için sınıfları burada tutulur.
export const drawerKbdVariants = cva([
  "inline-flex h-5 w-fit min-w-[20px] items-center justify-center rounded-md px-1",
  "border border-tag-neutral-border bg-tag-neutral-bg text-tag-neutral-text",
  "txt-compact-xsmall-plus",
])
