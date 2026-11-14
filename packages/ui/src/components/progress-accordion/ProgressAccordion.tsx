import { CircleCheck, CircleDashed, CircleDot, Plus } from "lucide-react"
import { Accordion as AccordionPrimitive } from "radix-ui"
import type { ComponentProps } from "react"
import { cn } from "../../utils/cn"
import { IconButton } from "../icon-button"
import type { ProgressStatus } from "../progress-tabs/variants"
import {
  progressAccordionContentVariants,
  progressAccordionHeaderVariants,
  progressAccordionIndicatorVariants,
  progressAccordionItemVariants,
} from "./variants"

export const ProgressAccordion = AccordionPrimitive.Root

export function ProgressAccordionItem({
  className,
  ...rest
}: ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-accordion-item=""
      className={cn(progressAccordionItemVariants(), className)}
      {...rest}
    />
  )
}

export function ProgressAccordionIndicator({
  status,
  className,
  ...rest
}: Omit<ComponentProps<"span">, "children"> & { status: ProgressStatus }) {
  return (
    <span
      className={cn(progressAccordionIndicatorVariants(), className)}
      data-status={status}
      {...rest}
    >
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

export function ProgressAccordionHeader({
  className,
  status = "not-started",
  children,
  ...rest
}: ComponentProps<typeof AccordionPrimitive.Header> & { status?: ProgressStatus }) {
  return (
    <AccordionPrimitive.Header
      className={cn(progressAccordionHeaderVariants(), className)}
      {...rest}
    >
      <ProgressAccordionIndicator status={status} />
      {children}
      <AccordionPrimitive.Trigger className="ml-auto" asChild>
        <IconButton variant="transparent">
          <Plus className="transform transition-transform group-data-[state=open]:rotate-45" />
        </IconButton>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

export function ProgressAccordionContent({
  className,
  ...rest
}: ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-accordion-content=""
      className={cn(progressAccordionContentVariants(), className)}
      {...rest}
    />
  )
}
