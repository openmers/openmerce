import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Container } from "./Container"

describe("Container", () => {
  it("renders a card container with its content", () => {
    render(<Container>Order summary</Container>)

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
    render(
      <Container data-testid="container" aria-label="Summary">
        Hi
      </Container>,
    )

    const container = screen.getByTestId("container")
    expect(container).toHaveAttribute("aria-label", "Summary")
  })

  it("merges a consumer class with the base classes", () => {
    render(<Container className="p-0 custom-class">Hi</Container>)

    const container = screen.getByText("Hi")
    expect(container).toHaveClass("p-0", "custom-class")
    expect(container).not.toHaveClass("px-6")
  })
})
