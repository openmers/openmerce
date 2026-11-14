import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Label } from "./Label"

describe("Label", () => {
  it("renders a label with the default size and weight", () => {
    render(<Label htmlFor="email">Email</Label>)

    const label = screen.getByText("Email")
    expect(label.tagName).toBe("LABEL")
    expect(label).toHaveClass("font-sans", "txt-compact-medium", "font-normal")
    expect(label).toHaveAttribute("for", "email")
  })

  it.each([
    ["xsmall", "txt-compact-xsmall"],
    ["small", "txt-compact-small"],
    ["base", "txt-compact-medium"],
    ["large", "txt-compact-large"],
  ] as const)("applies the %s size classes", (size, className) => {
    render(<Label size={size}>Email</Label>)

    expect(screen.getByText("Email")).toHaveClass(className)
  })

  it("applies the plus weight", () => {
    render(<Label weight="plus">Email</Label>)

    const label = screen.getByText("Email")
    expect(label).toHaveClass("font-medium")
    expect(label).not.toHaveClass("font-normal")
  })

  it("passes rest props and merges a consumer class", () => {
    render(
      <Label id="email-label" className="text-fg-error">
        Email
      </Label>,
    )

    const label = screen.getByText("Email")
    expect(label).toHaveAttribute("id", "email-label")
    expect(label).toHaveClass("text-fg-error")
  })
})
