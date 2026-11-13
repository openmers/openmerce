import { render, screen } from "@testing-library/svelte"
import { describe, expect, it } from "vitest"
import { textSnippet } from "../../test/snippet"
import Label from "./Label.svelte"

describe("Label", () => {
  it("renders a label with the default size and weight", () => {
    render(Label, { props: { for: "email", children: textSnippet("Email") } })

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
    render(Label, { props: { size, children: textSnippet("Email") } })

    expect(screen.getByText("Email")).toHaveClass(className)
  })

  it("applies the plus weight", () => {
    render(Label, { props: { weight: "plus", children: textSnippet("Email") } })

    const label = screen.getByText("Email")
    expect(label).toHaveClass("font-medium")
    expect(label).not.toHaveClass("font-normal")
  })

  it("passes rest props and merges a consumer class", () => {
    render(Label, {
      props: { id: "email-label", class: "text-fg-error", children: textSnippet("Email") },
    })

    const label = screen.getByText("Email")
    expect(label).toHaveAttribute("id", "email-label")
    expect(label).toHaveClass("text-fg-error")
  })
})
