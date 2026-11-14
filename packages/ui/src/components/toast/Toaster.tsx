import { Toaster as SonnerToaster, type ToasterProps as SonnerToasterProps } from "sonner"

// The kit narrows the sonner API (no rich colors, icons, theme or per-toast options); the same narrowing applies.
type Props = Omit<
  SonnerToasterProps,
  "richColors" | "closeButton" | "icons" | "theme" | "invert" | "toastOptions"
> & {
  duration?: number
}

export function Toaster({
  position = "bottom-right",
  gap = 12,
  offset = 24,
  duration,
  ...rest
}: Props) {
  return (
    <SonnerToaster
      position={position}
      gap={gap}
      offset={offset}
      toastOptions={{ duration }}
      {...rest}
    />
  )
}
