import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Kbd } from "./Kbd"

describe("Kbd", () => {
  it("renders a keyboard key with the neutral tag styles", () => {
    render(<Kbd>K</Kbd>)

    const kbd = screen.getByText("K")
    expect(kbd.tagName).toBe("KBD")
    expect(kbd).toHaveClass(
      "h-5",
      "min-w-[20px]",
      "rounded-md",
      "border-tag-neutral-border",
      "bg-tag-neutral-bg",
      "txt-compact-xsmall-plus",
    )
  })

  it("passes rest props to the kbd element", () => {
    render(
      <Kbd data-testid="kbd" title="Shortcut">
        ⌘
      </Kbd>,
    )

    expect(screen.getByTestId("kbd")).toHaveAttribute("title", "Shortcut")
  })

  it("merges a consumer class with the base classes", () => {
    render(<Kbd className="h-6 custom-class">K</Kbd>)

    const kbd = screen.getByText("K")
    expect(kbd).toHaveClass("h-6", "custom-class")
    expect(kbd).not.toHaveClass("h-5")
  })
})
