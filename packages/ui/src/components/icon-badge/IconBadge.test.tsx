import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { IconBadge } from "./IconBadge"

const colorClasses = [
  ["green", "bg-tag-green-bg"],
  ["red", "bg-tag-red-bg"],
  ["blue", "bg-tag-blue-bg"],
  ["orange", "bg-tag-orange-bg"],
  ["grey", "bg-tag-neutral-bg"],
  ["purple", "bg-tag-purple-bg"],
] as const

const icon = <svg aria-hidden="true" />

describe("IconBadge", () => {
  it("renders a neutral icon badge with the base size", () => {
    render(<IconBadge>{icon}</IconBadge>)

    const badge = document.querySelector("span")
    expect(badge).toHaveClass("bg-tag-neutral-bg", "h-6", "w-6", "rounded-md", "border")
  })

  it.each(colorClasses)("applies the %s color classes", (color, className) => {
    render(<IconBadge color={color}>{icon}</IconBadge>)

    expect(document.querySelector("span")).toHaveClass(className)
  })

  it("applies the large size classes", () => {
    render(<IconBadge size="large">{icon}</IconBadge>)

    expect(document.querySelector("span")).toHaveClass("h-7", "w-7")
  })

  it("passes rest props and merges a consumer class", () => {
    render(
      <IconBadge data-testid="icon-badge" className="h-8 w-8">
        {icon}
      </IconBadge>,
    )

    const badge = screen.getByTestId("icon-badge")
    expect(badge).toHaveClass("h-8", "w-8")
    expect(badge).not.toHaveClass("h-6")
  })
})
