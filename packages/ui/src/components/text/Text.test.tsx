import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Text } from "./Text"

const sizeClasses = [
  ["xsmall", "normal", "txt-xsmall"],
  ["xsmall", "compact", "txt-compact-xsmall"],
  ["small", "normal", "txt-small"],
  ["small", "compact", "txt-compact-small"],
  ["base", "normal", "txt-medium"],
  ["base", "compact", "txt-compact-medium"],
  ["large", "normal", "txt-large"],
  ["large", "compact", "txt-compact-large"],
  ["xlarge", "normal", "txt-xlarge"],
  ["xlarge", "compact", "txt-compact-xlarge"],
] as const

describe("Text", () => {
  it("renders a paragraph with the default size, weight and family", () => {
    render(<Text>Order details</Text>)

    const text = screen.getByText("Order details")
    expect(text.tagName).toBe("P")
    expect(text).toHaveClass("txt-medium", "font-normal", "font-sans")
  })

  it.each(sizeClasses)("applies %s/%s typography", (size, leading, className) => {
    render(
      <Text size={size} leading={leading}>
        Order details
      </Text>,
    )

    expect(screen.getByText("Order details")).toHaveClass(className)
  })

  it("applies the plus weight and mono family", () => {
    render(
      <Text weight="plus" family="mono">
        SKU-1
      </Text>,
    )

    const text = screen.getByText("SKU-1")
    expect(text).toHaveClass("font-medium", "font-mono")
    expect(text).not.toHaveClass("font-normal")
  })

  it("renders the requested element", () => {
    render(<Text as="span">Inline</Text>)

    expect(screen.getByText("Inline").tagName).toBe("SPAN")
  })

  it("passes rest props to the underlying element", () => {
    render(
      <Text as="div" data-testid="text" id="intro">
        Hello
      </Text>,
    )

    const text = screen.getByTestId("text")
    expect(text.tagName).toBe("DIV")
    expect(text).toHaveAttribute("id", "intro")
  })

  it("merges a consumer class with the variant classes", () => {
    render(<Text className="text-fg-error custom-class">Hi</Text>)

    const text = screen.getByText("Hi")
    expect(text).toHaveClass("text-fg-error", "custom-class", "txt-medium")
  })
})
