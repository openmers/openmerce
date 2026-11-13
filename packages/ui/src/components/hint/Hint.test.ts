import { render, screen } from "@testing-library/svelte"
import { describe, expect, it } from "vitest"
import { textSnippet } from "../../test/snippet"
import Hint from "./Hint.svelte"

describe("Hint", () => {
  it("renders an informational hint by default", () => {
    render(Hint, { props: { children: textSnippet("Use a valid email") } })

    const hint = screen.getByText("Use a valid email")
    expect(hint.tagName).toBe("SPAN")
    expect(hint).toHaveClass("txt-small", "text-muted-foreground")
    expect(hint.querySelector("svg")).toBeNull()
  })

  it("renders the error variant with an icon", () => {
    render(Hint, { props: { variant: "error", children: textSnippet("This field is required") } })

    const hint = screen.getByText("This field is required")
    expect(hint).toHaveClass("text-fg-error", "grid", "grid-cols-[20px_1fr]")
    expect(hint.querySelector("svg")).toBeInTheDocument()
  })

  it("passes rest props to the span", () => {
    render(Hint, { props: { id: "hint", role: "note", children: textSnippet("Hint") } })

    expect(screen.getByRole("note")).toHaveAttribute("id", "hint")
  })

  it("merges a consumer class with the variant classes", () => {
    render(Hint, { props: { class: "mt-1 custom-class", children: textSnippet("Hint") } })

    expect(screen.getByText("Hint")).toHaveClass("mt-1", "custom-class", "text-muted-foreground")
  })
})
