import { render, screen } from "@testing-library/svelte"
import { describe, expect, it } from "vitest"
import { textSnippet } from "../../test/snippet"
import Kbd from "./Kbd.svelte"

describe("Kbd", () => {
  it("renders a keyboard key with the neutral tag styles", () => {
    render(Kbd, { props: { children: textSnippet("K") } })

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
    render(Kbd, { props: { "data-testid": "kbd", title: "Shortcut", children: textSnippet("⌘") } })

    expect(screen.getByTestId("kbd")).toHaveAttribute("title", "Shortcut")
  })

  it("merges a consumer class with the base classes", () => {
    render(Kbd, { props: { class: "h-6 custom-class", children: textSnippet("K") } })

    const kbd = screen.getByText("K")
    expect(kbd).toHaveClass("h-6", "custom-class")
    expect(kbd).not.toHaveClass("h-5")
  })
})
