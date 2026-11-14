import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { CodeBlock, type CodeSnippet } from "./CodeBlock"

const snippets: [CodeSnippet, CodeSnippet] = [
  { label: "TypeScript", language: "ts", code: "const a = 1\nconst b = 2" },
  { label: "JSON", language: "json", code: '{ "a": 1 }' },
]

describe("CodeBlock", () => {
  it("renders the first snippet by default", () => {
    render(<CodeBlock snippets={snippets} />)

    expect(screen.getByText("const a = 1")).toBeInTheDocument()
    expect(screen.getByText("const b = 2")).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "TypeScript" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("tab", { name: "JSON" })).toHaveAttribute("aria-selected", "false")
  })

  it("renders numbered lines", () => {
    render(<CodeBlock snippets={snippets} />)

    const numbers = screen.getByRole("presentation")
    expect(numbers).toHaveClass("flex", "flex-col", "text-right")
    expect(numbers.querySelectorAll("span")[0]).toHaveClass(
      "tabular-nums",
      "text-contrast-fg-secondary",
    )
    expect(numbers.querySelectorAll("span")).toHaveLength(2)
  })

  it("switches the active snippet when a tab is clicked", async () => {
    const user = userEvent.setup()
    render(<CodeBlock snippets={snippets} />)

    await user.click(screen.getByRole("tab", { name: "JSON" }))

    expect(screen.getByText('{ "a": 1 }')).toBeInTheDocument()
    expect(screen.queryByText("const a = 1")).not.toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "JSON" })).toHaveAttribute("aria-selected", "true")
  })

  it("hides labels and line numbers when requested", () => {
    render(<CodeBlock snippets={[{ ...snippets[0], hideLineNumbers: true }]} hideLabels />)

    expect(screen.queryByRole("tab")).not.toBeInTheDocument()
    expect(screen.queryByRole("presentation")).not.toBeInTheDocument()
    expect(screen.getByText("const a = 1")).toBeInTheDocument()
  })

  it("hides the copy button when the snippet opts out", () => {
    render(<CodeBlock snippets={[{ ...snippets[0], hideCopy: true }]} />)

    expect(screen.queryByRole("button", { name: "Copy code snippet" })).not.toBeInTheDocument()
  })

  it("shows the copy button and toolbar content", () => {
    render(<CodeBlock snippets={snippets}>Terminal</CodeBlock>)

    expect(screen.getByRole("button", { name: "Copy code snippet" })).toBeInTheDocument()
    expect(screen.getByText("Terminal")).toBeInTheDocument()
  })

  it("passes rest props and merges a consumer class", () => {
    render(<CodeBlock snippets={snippets} data-testid="code-block" className="mt-4 custom-class" />)

    const block = screen.getByTestId("code-block")
    expect(block).toHaveClass("mt-4", "custom-class")
    expect(block).toHaveClass("bg-contrast-bg-base", "shadow-elevation-code-block")
  })
})
