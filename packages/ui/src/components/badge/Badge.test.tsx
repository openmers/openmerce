import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Badge } from "./Badge"

const colorClasses = [
  ["green", ["bg-tag-green-bg", "text-tag-green-text", "border-tag-green-border"]],
  ["red", ["bg-tag-red-bg", "text-tag-red-text", "border-tag-red-border"]],
  ["blue", ["bg-tag-blue-bg", "text-tag-blue-text", "border-tag-blue-border"]],
  ["orange", ["bg-tag-orange-bg", "text-tag-orange-text", "border-tag-orange-border"]],
  ["grey", ["bg-tag-neutral-bg", "text-tag-neutral-text", "border-tag-neutral-border"]],
  ["purple", ["bg-tag-purple-bg", "text-tag-purple-text", "border-tag-purple-border"]],
] as const

const sizeClasses = [
  ["2xsmall", ["txt-compact-xsmall-plus", "h-5", "px-1"]],
  ["xsmall", ["txt-compact-xsmall-plus", "h-6", "px-1.5"]],
  ["small", ["txt-compact-xsmall-plus", "h-7", "px-2"]],
  ["base", ["txt-compact-small-plus", "h-8", "px-2.5"]],
  ["large", ["txt-compact-medium-plus", "h-10", "px-3"]],
] as const

describe("Badge", () => {
  it("renders its content with the default color, size and rounded corners", () => {
    render(<Badge>Paid</Badge>)

    const badge = screen.getByText("Paid")
    expect(badge).toHaveClass("bg-tag-neutral-bg", "txt-compact-small-plus", "rounded-md", "px-2.5")
  })

  it.each(colorClasses)("applies the %s color classes", (color, classes) => {
    render(<Badge color={color}>Paid</Badge>)

    expect(screen.getByText("Paid")).toHaveClass(...classes)
  })

  it.each(sizeClasses)("applies the %s size classes", (size, classes) => {
    render(<Badge size={size}>Paid</Badge>)

    expect(screen.getByText("Paid")).toHaveClass(...classes)
  })

  it("applies full rounding with its size padding", () => {
    render(<Badge rounded="full">Paid</Badge>)

    const badge = screen.getByText("Paid")
    expect(badge).toHaveClass("rounded-full", "px-3")
    expect(badge).not.toHaveClass("rounded-md")
  })

  it("passes rest props to the underlying span", () => {
    render(
      <Badge data-testid="badge" title="Payment status">
        Paid
      </Badge>,
    )

    const badge = screen.getByTestId("badge")
    expect(badge).toHaveAttribute("title", "Payment status")
    expect(badge.tagName).toBe("SPAN")
  })

  it("merges a consumer class with the variant classes", () => {
    render(<Badge className="px-6 custom-class">Paid</Badge>)

    const badge = screen.getByText("Paid")
    expect(badge).toHaveClass("px-6", "custom-class")
    expect(badge).not.toHaveClass("px-2.5")
  })
})
