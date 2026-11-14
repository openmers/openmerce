import { CircleCheck, CircleDashed, CircleDot } from "lucide-react"
import { Tabs as TabsPrimitive } from "radix-ui"
import type { ComponentProps } from "react"
import { cn } from "../../utils/cn"
import {
  type ProgressStatus,
  progressTabsContentVariants,
  progressTabsIndicatorVariants,
  progressTabsListVariants,
  progressTabsTriggerVariants,
} from "./variants"

export function ProgressTabs({
  activationMode = "automatic",
  ...rest
}: ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root activationMode={activationMode} {...rest} />
}

export function ProgressTabsList({
  className,
  ...rest
}: ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn(progressTabsListVariants(), className)} {...rest} />
}

export function ProgressTabsIndicator({
  status = "not-started",
  className,
}: {
  status?: ProgressStatus
  className?: string
}) {
  return (
    <span className={cn(progressTabsIndicatorVariants(), className)} data-status={status}>
      {status === "completed" ? (
        <CircleCheck />
      ) : status === "in-progress" ? (
        <CircleDot />
      ) : (
        <CircleDashed />
      )}
    </span>
  )
}

export function ProgressTabsTrigger({
  className,
  status = "not-started",
  children,
  ...rest
}: ComponentProps<typeof TabsPrimitive.Trigger> & { status?: ProgressStatus }) {
  return (
    <TabsPrimitive.Trigger className={cn(progressTabsTriggerVariants(), className)} {...rest}>
      <ProgressTabsIndicator status={status} />
      {children}
    </TabsPrimitive.Trigger>
  )
}

export function ProgressTabsContent({
  className,
  ...rest
}: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content className={cn(progressTabsContentVariants(), className)} {...rest} />
  )
}
