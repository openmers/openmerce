import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Code } from "./Code"

describe("Code", () => {
  it("renders its content as a code element with the neutral tag styles", () => {
    render(<Code>npm install</Code>)

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
    render(
      <Code data-testid="code" title="Command">
        ls
      </Code>,
    )

    expect(screen.getByTestId("code")).toHaveAttribute("title", "Command")
  })

  it("merges a consumer class with the base classes", () => {
    render(<Code className="px-2 custom-class">ls</Code>)

    const code = screen.getByText("ls")
    expect(code).toHaveClass("px-2", "custom-class")
    expect(code).not.toHaveClass("px-[6px]")
  })
})
