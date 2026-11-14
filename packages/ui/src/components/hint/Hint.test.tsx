import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Hint } from "./Hint"

describe("Hint", () => {
  it("renders an informational hint by default", () => {
    render(<Hint>Use a valid email</Hint>)

    const hint = screen.getByText("Use a valid email")
    expect(hint.tagName).toBe("SPAN")
    expect(hint).toHaveClass("txt-small", "text-muted-foreground")
    expect(hint.querySelector("svg")).toBeNull()
  })

  it("renders the error variant with an icon", () => {
    render(<Hint variant="error">This field is required</Hint>)

    const hint = screen.getByText("This field is required")
    expect(hint).toHaveClass("text-fg-error", "grid", "grid-cols-[20px_1fr]")
    expect(hint.querySelector("svg")).toBeInTheDocument()
  })

  it("passes rest props to the span", () => {
    render(
      <Hint id="hint" role="note">
        Hint
      </Hint>,
    )

    expect(screen.getByRole("note")).toHaveAttribute("id", "hint")
  })

  it("merges a consumer class with the variant classes", () => {
    render(<Hint className="mt-1 custom-class">Hint</Hint>)

    expect(screen.getByText("Hint")).toHaveClass("mt-1", "custom-class", "text-muted-foreground")
  })
})
