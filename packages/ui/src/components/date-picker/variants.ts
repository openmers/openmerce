import { cva } from "class-variance-authority"

// Medusa UI date-picker.tsx (MIT). `bg-ui-bg-field` → `bg-bg-field`, `shadow-borders-base` aynı.
export const datePickerGroupVariants = cva(
  [
    "bg-bg-field shadow-borders-base txt-compact-small text-foreground transition-fg grid items-center gap-2 overflow-hidden rounded-md h-fit",
    "focus-within:shadow-borders-interactive-with-active focus-visible:shadow-borders-interactive-with-active",
    "aria-[invalid=true]:shadow-borders-error invalid:shadow-borders-error",
  ],
  {
    variants: {
      size: {
        small: "grid-cols-[28px_1fr]",
        base: "grid-cols-[32px_1fr]",
      },
      hasValue: {
        true: "",
        false: "pr-2",
      },
      isOpen: {
        true: "shadow-borders-interactive-with-active",
        false: "",
      },
      isInvalid: {
        true: "shadow-borders-error",
        false: "",
      },
    },
    compoundVariants: [
      { size: "small", hasValue: true, className: "grid-cols-[28px_1fr_28px]" },
      { size: "base", hasValue: true, className: "grid-cols-[32px_1fr_32px]" },
    ],
    defaultVariants: { size: "base", hasValue: false, isOpen: false, isInvalid: false },
  },
)

export const datePickerButtonVariants = cva(
  [
    "flex items-center justify-center border-r text-muted-foreground outline-hidden transition-fg",
    "disabled:text-fg-disabled",
    "hover:bg-button-transparent-hover",
    "focus-visible:bg-bg-interactive focus-visible:text-fg-on-color",
  ],
  {
    variants: {
      size: { small: "size-7", base: "size-8" },
    },
    defaultVariants: { size: "base" },
  },
)

export const datePickerClearButtonVariants = cva([
  "flex size-full items-center justify-center text-muted-foreground outline-hidden transition-fg",
  "hover:bg-button-transparent-hover",
  "focus-visible:bg-bg-interactive focus-visible:text-fg-on-color",
])

export const datePickerContentVariants = cva("flex flex-col p-0 [&>*+*]:border-t")

export const datePickerPanelVariants = cva("p-3")
