import { render, screen } from "@testing-library/svelte"
import { describe, expect, it } from "vitest"
import { textSnippet } from "../../test/snippet"
import Container from "./Container.svelte"

describe("Container", () => {
  it("renders a card container with its content", () => {
    render(Container, { props: { children: textSnippet("Order summary") } })

    const container = screen.getByText("Order summary")
    expect(container.tagName).toBe("DIV")
    expect(container).toHaveClass(
      "w-full",
      "rounded-lg",
      "bg-card",
      "px-6",
      "py-4",
      "shadow-elevation-card-rest",
    )
  })

  it("passes rest props to the underlying div", () => {
    render(Container, {
      props: { "data-testid": "container", "aria-label": "Summary", children: textSnippet("Hi") },
    })

    const container = screen.getByTestId("container")
    expect(container).toHaveAttribute("aria-label", "Summary")
  })

  it("merges a consumer class with the base classes", () => {
    render(Container, { props: { class: "p-0 custom-class", children: textSnippet("Hi") } })

    const container = screen.getByText("Hi")
    expect(container).toHaveClass("p-0", "custom-class")
    expect(container).not.toHaveClass("px-6")
  })
})
