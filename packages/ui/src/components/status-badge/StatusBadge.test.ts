import { render, screen } from "@testing-library/svelte"
import { describe, expect, it } from "vitest"
import { textSnippet } from "../../test/snippet"
import StatusBadge from "./StatusBadge.svelte"

const colorClasses = [
  ["green", "[&_div]:bg-tag-green-icon"],
  ["red", "[&_div]:bg-tag-red-icon"],
  ["orange", "[&_div]:bg-tag-orange-icon"],
  ["blue", "[&_div]:bg-tag-blue-icon"],
  ["purple", "[&_div]:bg-tag-purple-icon"],
  ["grey", "[&_div]:bg-tag-neutral-icon"],
] as const

describe("StatusBadge", () => {
  it("renders its label with a neutral dot by default", () => {
    render(StatusBadge, { props: { children: textSnippet("Draft") } })

    const badge = screen.getByText("Draft")
    expect(badge.tagName).toBe("SPAN")
    expect(badge).toHaveClass(
      "txt-compact-xsmall-plus",
      "rounded-md",
      "border-border",
      "bg-background",
      "text-muted-foreground",
    )
    expect(badge.querySelector('[role="presentation"]')).toHaveClass("[&_div]:bg-tag-neutral-icon")
  })

  it.each(colorClasses)("applies the %s dot color", (color, className) => {
    render(StatusBadge, { props: { color, children: textSnippet("Draft") } })

    expect(screen.getByRole("presentation")).toHaveClass(className)
  })

  it("passes rest props and merges a consumer class", () => {
    render(StatusBadge, {
      props: {
        "data-testid": "status",
        class: "ml-1 custom-class",
        children: textSnippet("Draft"),
      },
    })

    expect(screen.getByTestId("status")).toHaveClass("ml-1", "custom-class")
  })
})
