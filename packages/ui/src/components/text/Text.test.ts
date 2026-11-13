import { render, screen } from "@testing-library/svelte"
import { describe, expect, it } from "vitest"
import { textSnippet } from "../../test/snippet"
import Text from "./Text.svelte"

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
    render(Text, { props: { children: textSnippet("Order details") } })

    const text = screen.getByText("Order details")
    expect(text.tagName).toBe("P")
    expect(text).toHaveClass("txt-medium", "font-normal", "font-sans")
  })

  it.each(sizeClasses)("applies %s/%s typography", (size, leading, className) => {
    render(Text, { props: { size, leading, children: textSnippet("Order details") } })

    expect(screen.getByText("Order details")).toHaveClass(className)
  })

  it("applies the plus weight and mono family", () => {
    render(Text, { props: { weight: "plus", family: "mono", children: textSnippet("SKU-1") } })

    const text = screen.getByText("SKU-1")
    expect(text).toHaveClass("font-medium", "font-mono")
    expect(text).not.toHaveClass("font-normal")
  })

  it("renders the requested element", () => {
    render(Text, { props: { as: "span", children: textSnippet("Inline") } })

    expect(screen.getByText("Inline").tagName).toBe("SPAN")
  })

  it("passes rest props to the underlying element", () => {
    render(Text, {
      props: { as: "div", "data-testid": "text", id: "intro", children: textSnippet("Hello") },
    })

    const text = screen.getByTestId("text")
    expect(text.tagName).toBe("DIV")
    expect(text).toHaveAttribute("id", "intro")
  })

  it("merges a consumer class with the variant classes", () => {
    render(Text, { props: { class: "text-fg-error custom-class", children: textSnippet("Hi") } })

    const text = screen.getByText("Hi")
    expect(text).toHaveClass("text-fg-error", "custom-class", "txt-medium")
  })
})
