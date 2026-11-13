import { cva } from "class-variance-authority"

// Ported from an MIT-licensed UI kit; see NOTICE. The cells apply the same classes onto bits-ui `PinInput.Cell`;
// instead of the real `<input>` in Radix, the `data-active` state carries the focus look.
export const otpInputVariants = cva("flex items-center justify-center gap-x-3")

export const otpGroupVariants = cva("flex")

export const otpSeparatorVariants = cva("txt-compact-small-plus text-muted-foreground")

export const otpCellVariants = cva([
  "txt-compact-large font-mono text-foreground bg-bg-field shadow-borders-base transition-fg relative -ml-px flex size-10 appearance-none items-center justify-center border-0 text-center outline-hidden",
  "first:ml-0 first:rounded-l-md last:rounded-r-md",
  "data-[active]:z-10 data-[active]:shadow-borders-interactive-with-active",
  "data-[disabled]:text-fg-disabled data-[disabled]:!bg-muted data-[disabled]:cursor-not-allowed",
  "aria-[invalid=true]:!shadow-borders-error",
])
