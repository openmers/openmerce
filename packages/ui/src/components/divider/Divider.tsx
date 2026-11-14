import type { ComponentProps } from "react"
import { cn } from "../../utils/cn"

type Props = Omit<ComponentProps<"div">, "children"> & {
  orientation?: "horizontal" | "vertical"
  variant?: "dashed" | "solid"
}

export function Divider({
  orientation = "horizontal",
  variant = "solid",
  className,
  ...rest
}: Props) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: <hr> cannot be vertical; one element serves both orientations
    <div
      aria-orientation={orientation}
      role="separator"
      className={cn(
        "border-border",
        {
          "w-full border-t": orientation === "horizontal" && variant === "solid",
          "h-full border-l": orientation === "vertical" && variant === "solid",
          "bg-transparent": variant === "dashed",
          "h-px w-full bg-[linear-gradient(90deg,var(--border-strong)_1px,transparent_1px)] bg-[length:4px_1px]":
            variant === "dashed" && orientation === "horizontal",
          "h-full w-px bg-[linear-gradient(0deg,var(--border-strong)_1px,transparent_1px)] bg-[length:1px_4px]":
            variant === "dashed" && orientation === "vertical",
        },
        className,
      )}
      {...rest}
    />
  )
}
