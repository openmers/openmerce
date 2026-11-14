import { RadioGroup as RadioGroupPrimitive } from "radix-ui"
import { type ComponentProps, useId } from "react"
import { cn } from "../../utils/cn"
import {
  radioGroupChoiceBoxVariants,
  radioGroupDotVariants,
  radioGroupIndicatorVariants,
  radioGroupItemVariants,
  radioGroupVariants,
} from "./variants"

export function RadioGroup({
  className,
  ...rest
}: ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return <RadioGroupPrimitive.Root className={cn(radioGroupVariants(), className)} {...rest} />
}

export function RadioGroupItem({
  className,
  children,
  ...rest
}: ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item className={cn(radioGroupItemVariants(), className)} {...rest}>
      <div className={radioGroupIndicatorVariants()} data-indicator="">
        <RadioGroupPrimitive.Indicator className={radioGroupDotVariants()} />
        {children && <span className="group-data-[state=checked]:hidden">{children}</span>}
      </div>
    </RadioGroupPrimitive.Item>
  )
}

export function RadioGroupChoiceBox({
  className,
  id,
  label,
  description,
  ...rest
}: Omit<ComponentProps<typeof RadioGroupPrimitive.Item>, "children"> & {
  label: string
  description: string
}) {
  const generatedId = useId()
  const boxId = id ?? generatedId
  const descriptionId = `${boxId}-description`
  return (
    <RadioGroupPrimitive.Item
      className={cn(radioGroupChoiceBoxVariants(), className)}
      id={boxId}
      aria-describedby={descriptionId}
      {...rest}
    >
      <div className="flex h-5 w-5 items-center justify-center">
        <div className={radioGroupIndicatorVariants()} data-indicator="">
          <RadioGroupPrimitive.Indicator className={radioGroupDotVariants()} />
        </div>
      </div>
      <div className="flex flex-col items-start">
        <span className="txt-compact-small font-medium group-disabled:text-fg-disabled">
          {label}
        </span>
        <span
          className="txt-small text-muted-foreground group-disabled:text-fg-disabled text-left"
          id={descriptionId}
        >
          {description}
        </span>
      </div>
    </RadioGroupPrimitive.Item>
  )
}
