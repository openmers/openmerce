import { Switch as SwitchPrimitive } from "radix-ui"
import type { ComponentProps } from "react"
import { cn } from "../../utils/cn"
import { type SwitchVariants, switchThumbVariants, switchVariants } from "./variants"

type Props = ComponentProps<typeof SwitchPrimitive.Root> & SwitchVariants

export function Switch({ className, size = "base", ...rest }: Props) {
  return (
    <SwitchPrimitive.Root className={cn(switchVariants({ size }), className)} {...rest}>
      <SwitchPrimitive.Thumb className={switchThumbVariants({ size })} />
    </SwitchPrimitive.Root>
  )
}
