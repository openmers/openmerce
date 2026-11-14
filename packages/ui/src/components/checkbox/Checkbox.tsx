import { Check, Minus } from "lucide-react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"
import { type ComponentProps, useState } from "react"
import { cn } from "../../utils/cn"
import { checkboxIndicatorVariants, checkboxVariants } from "./variants"

type Props = Omit<
  ComponentProps<typeof CheckboxPrimitive.Root>,
  "checked" | "defaultChecked" | "onCheckedChange"
> & {
  checked?: boolean
  defaultChecked?: boolean
  /** Controlled by the consumer: clear it in `onCheckedChange` once the user picks a value. */
  indeterminate?: boolean
  onCheckedChange?: (checked: boolean) => void
}

export function Checkbox({
  className,
  checked,
  defaultChecked = false,
  indeterminate = false,
  onCheckedChange,
  ...rest
}: Props) {
  const [innerChecked, setInnerChecked] = useState(defaultChecked)
  const isChecked = checked ?? innerChecked

  return (
    <CheckboxPrimitive.Root
      checked={indeterminate ? "indeterminate" : isChecked}
      onCheckedChange={(value) => {
        const next = value === true
        setInnerChecked(next)
        onCheckedChange?.(next)
      }}
      className={cn(checkboxVariants(), className)}
      {...rest}
    >
      <div className={checkboxIndicatorVariants()} data-indicator="">
        {indeterminate ? (
          <Minus className="size-[15px]" />
        ) : isChecked ? (
          <Check className="size-[15px]" />
        ) : null}
      </div>
    </CheckboxPrimitive.Root>
  )
}
