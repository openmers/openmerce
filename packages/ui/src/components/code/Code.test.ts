import { render, screen } from "@testing-library/svelte"
import { describe, expect, it } from "vitest"
import { textSnippet } from "../../test/snippet"
import Code from "./Code.svelte"

describe("Code", () => {
  it("renders its content as a code element with the neutral tag styles", () => {
    render(Code, { props: { children: textSnippet("npm install") } })

    const code = screen.getByText("npm install")
    expect(code.tagName).toBe("CODE")
    expect(code).toHaveClass(
      "txt-compact-small",
      "inline-flex",
      "rounded-md",
      "border-tag-neutral-border",
      "bg-tag-neutral-bg",
      "font-mono",
      "text-tag-neutral-text",
    )
  })

  it("passes rest props to the code element", () => {
    render(Code, {
      props: { "data-testid": "code", title: "Command", children: textSnippet("ls") },
    })

    expect(screen.getByTestId("code")).toHaveAttribute("title", "Command")
  })

  it("merges a consumer class with the base classes", () => {
    render(Code, { props: { class: "px-2 custom-class", children: textSnippet("ls") } })

    const code = screen.getByText("ls")
    expect(code).toHaveClass("px-2", "custom-class")
    expect(code).not.toHaveClass("px-[6px]")
  })
})
