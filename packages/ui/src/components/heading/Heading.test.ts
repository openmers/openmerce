import { render, screen } from "@testing-library/svelte"
import { describe, expect, it } from "vitest"
import { textSnippet } from "../../test/snippet"
import Heading from "./Heading.svelte"

describe("Heading", () => {
  it("renders an h1 with the default level classes", () => {
    render(Heading, { props: { children: textSnippet("Orders") } })

    const heading = screen.getByRole("heading", { level: 1, name: "Orders" })
    expect(heading).toHaveClass("h1-core", "font-sans", "font-medium")
  })

  it.each([
    ["h2", 2, "h2-core"],
    ["h3", 3, "h3-core"],
  ] as const)("renders %s with its typography", (level, tagLevel, className) => {
    render(Heading, { props: { level, children: textSnippet("Orders") } })

    const heading = screen.getByRole("heading", { level: tagLevel, name: "Orders" })
    expect(heading).toHaveClass(className)
  })

  it("passes rest props to the underlying heading", () => {
    render(Heading, {
      props: { id: "page-title", "data-testid": "heading", children: textSnippet("Orders") },
    })

    expect(screen.getByTestId("heading")).toHaveAttribute("id", "page-title")
  })

  it("merges a consumer class with the level classes", () => {
    render(Heading, { props: { class: "text-fg-error custom-class", children: textSnippet("Hi") } })

    expect(screen.getByRole("heading", { name: "Hi" })).toHaveClass("text-fg-error", "custom-class")
  })
})
