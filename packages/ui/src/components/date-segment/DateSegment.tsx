import type { ComponentProps } from "react"
import { cn } from "../../utils/cn"
import type { DateFieldSegment, SegmentPart } from "./use-date-field"
import {
  dateSegmentLiteralVariants,
  dateSegmentPlaceholderVariants,
  dateSegmentVariants,
} from "./variants"

type DateSegmentProps = Omit<ComponentProps<"span">, "children"> & {
  part: SegmentPart | "literal"
  value: string
}

/** Renders one segment from `useDateField`; spread the segment `props` to make it editable. */
export function DateSegment({ part, value, className, ...rest }: DateSegmentProps) {
  if (part === "literal") {
    return <span className={dateSegmentLiteralVariants()}>{value.trim() === "," ? "" : value}</span>
  }
  // Empty parts are shown with format letters ("mm", "dd"...).
  const isEmpty = part !== "dayPeriod" && value.trim() !== "" && !/\d/.test(value)
  return (
    <span data-segment={part} className={cn(dateSegmentVariants(), className)} {...rest}>
      <span className={cn(isEmpty && dateSegmentPlaceholderVariants())}>{value}</span>
    </span>
  )
}

/** Renders every segment returned by `useDateField`, editable parts included. */
export function DateSegments({ segments }: { segments: DateFieldSegment[] }) {
  return segments.map((segment, index) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: segment order is fixed per locale
    <DateSegment key={index} part={segment.part} value={segment.value} {...segment.props} />
  ))
}
