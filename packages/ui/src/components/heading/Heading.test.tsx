import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Heading } from "./Heading"

describe("Heading", () => {
  it("renders an h1 with the default level classes", () => {
    render(<Heading>Orders</Heading>)

    const heading = screen.getByRole("heading", { level: 1, name: "Orders" })
    expect(heading).toHaveClass("h1-core", "font-sans", "font-medium")
  })

  it.each([
    ["h2", 2, "h2-core"],
    ["h3", 3, "h3-core"],
  ] as const)("renders %s with its typography", (level, tagLevel, className) => {
    render(<Heading level={level}>Orders</Heading>)

    const heading = screen.getByRole("heading", { level: tagLevel, name: "Orders" })
    expect(heading).toHaveClass(className)
  })

  it("passes rest props to the underlying heading", () => {
    render(
      <Heading id="page-title" data-testid="heading">
        Orders
      </Heading>,
    )

    expect(screen.getByTestId("heading")).toHaveAttribute("id", "page-title")
  })

  it("merges a consumer class with the level classes", () => {
    render(<Heading className="text-fg-error custom-class">Hi</Heading>)

    expect(screen.getByRole("heading", { name: "Hi" })).toHaveClass("text-fg-error", "custom-class")
  })
})
