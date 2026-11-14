import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { InlineTip } from "./InlineTip"

const barClasses = [
  ["info", "bg-tag-neutral-icon"],
  ["warning", "bg-tag-orange-icon"],
  ["error", "bg-tag-red-icon"],
  ["success", "bg-tag-green-icon"],
] as const

describe("InlineTip", () => {
  it("renders a label and its content", () => {
    render(<InlineTip label="Note">Use a real address</InlineTip>)

    expect(screen.getByText("Note:")).toHaveClass("txt-small-plus", "text-foreground")
    expect(screen.getByText("Use a real address")).toBeInTheDocument()
  })

  it("renders the info bar by default", () => {
    render(<InlineTip label="Note">Body</InlineTip>)

    const tip = screen.getByText("Note:").parentElement?.parentElement
    expect(tip).toHaveClass("bg-popover", "grid", "grid-cols-[4px_1fr]", "rounded-lg", "p-3")
    expect(screen.getByRole("presentation")).toHaveClass("bg-tag-neutral-icon")
  })

  it.each(barClasses)("applies the %s bar color", (variant, className) => {
    render(
      <InlineTip variant={variant} label="Note">
        Body
      </InlineTip>,
    )

    expect(screen.getByRole("presentation")).toHaveClass(className)
  })

  it("passes rest props and merges a consumer class", () => {
    render(
      <InlineTip label="Note" className="mt-2 custom-class">
        Body
      </InlineTip>,
    )

    expect(screen.getByText("Note:").parentElement?.parentElement).toHaveClass(
      "mt-2",
      "custom-class",
    )
  })
})
