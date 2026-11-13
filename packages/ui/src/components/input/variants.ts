import { cva, type VariantProps } from "class-variance-authority"

// Medusa UI input.tsx (MIT). Textarea aynı taban stilleri kullanır.
export const inputBaseStyles =
  "caret-foreground bg-bg-field hover:bg-bg-field-hover shadow-borders-base placeholder-fg-muted text-foreground transition-fg relative w-full appearance-none rounded-md outline-hidden focus-visible:shadow-borders-interactive-with-active disabled:text-fg-disabled disabled:!bg-muted disabled:placeholder-fg-disabled disabled:cursor-not-allowed aria-[invalid=true]:!shadow-borders-error invalid:!shadow-borders-error"

export const inputVariants = cva([inputBaseStyles], {
  variants: {
    size: {
      base: "txt-compact-small h-8 px-2 py-1.5",
      small: "txt-compact-small h-7 px-2 py-1",
    },
  },
  defaultVariants: {
    size: "base",
  },
})

export type InputVariants = VariantProps<typeof inputVariants>
