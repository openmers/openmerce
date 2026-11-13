import { render, screen } from "@testing-library/svelte"
import { describe, expect, it } from "vitest"
import { textSnippet } from "../../test/snippet"
import InlineTip from "./InlineTip.svelte"

const barClasses = [
  ["info", "bg-tag-neutral-icon"],
  ["warning", "bg-tag-orange-icon"],
  ["error", "bg-tag-red-icon"],
  ["success", "bg-tag-green-icon"],
] as const

describe("InlineTip", () => {
  it("renders a label and its content", () => {
    render(InlineTip, { props: { label: "Note", children: textSnippet("Use a real address") } })

    expect(screen.getByText("Note:")).toHaveClass("txt-small-plus", "text-foreground")
    expect(screen.getByText("Use a real address")).toBeInTheDocument()
  })

  it("renders the info bar by default", () => {
    render(InlineTip, { props: { label: "Note", children: textSnippet("Body") } })

    const tip = screen.getByText("Note:").parentElement?.parentElement
    expect(tip).toHaveClass("bg-popover", "grid", "grid-cols-[4px_1fr]", "rounded-lg", "p-3")
    expect(screen.getByRole("presentation")).toHaveClass("bg-tag-neutral-icon")
  })

  it.each(barClasses)("applies the %s bar color", (variant, className) => {
    render(InlineTip, { props: { variant, label: "Note", children: textSnippet("Body") } })

    expect(screen.getByRole("presentation")).toHaveClass(className)
  })

  it("passes rest props and merges a consumer class", () => {
    render(InlineTip, {
      props: { label: "Note", class: "mt-2 custom-class", children: textSnippet("Body") },
    })

    expect(screen.getByText("Note:").parentElement?.parentElement).toHaveClass(
      "mt-2",
      "custom-class",
    )
  })
})
