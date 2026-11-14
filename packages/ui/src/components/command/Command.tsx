import type { ComponentProps } from "react"
import { cn } from "../../utils/cn"
import { commandVariants } from "./variants"

// The kit's `Command.Copy` subcomponent maps to the B1 `Copy` component; only the body lives here.
export function Command({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cn(commandVariants(), className)} {...rest} />
}
