import type { ComponentProps } from "react"
import { cn } from "../../utils/cn"
import { inputBaseStyles } from "../input/variants"

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(inputBaseStyles, "txt-small min-h-[60px] w-full px-2 py-1.5", className)}
      {...rest}
    />
  )
}
