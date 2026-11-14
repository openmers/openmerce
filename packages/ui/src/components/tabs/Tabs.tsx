import { Tabs as TabsPrimitive } from "radix-ui"
import type { ComponentProps } from "react"
import { cn } from "../../utils/cn"
import { tabsContentVariants, tabsListVariants, tabsTriggerVariants } from "./variants"

export const Tabs = TabsPrimitive.Root

export function TabsList({ className, ...rest }: ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn(tabsListVariants(), className)} {...rest} />
}

export function TabsTrigger({ className, ...rest }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return <TabsPrimitive.Trigger className={cn(tabsTriggerVariants(), className)} {...rest} />
}

export function TabsContent({ className, ...rest }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn(tabsContentVariants(), className)} {...rest} />
}
