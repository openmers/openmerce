import { render, screen } from "@testing-library/svelte"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { textSnippet } from "../../test/snippet"
import Copy from "./Copy.svelte"

afterEach(() => {
  vi.useRealTimers()
})

describe("Copy", () => {
  it("renders a copy button with an accessible name", () => {
    render(Copy, { props: { content: "npm install" } })

    const button = screen.getByRole("button", { name: "Copy code snippet" })
    expect(button).toHaveAttribute("type", "button")
    expect(button).toHaveClass("h-fit", "w-fit")
    expect(button.querySelector("svg")).toBeInTheDocument()
  })

  it("writes the content to the clipboard", async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, "writeText")
    render(Copy, { props: { content: "npm install" } })

    await user.click(screen.getByRole("button", { name: "Copy code snippet" }))

    expect(writeText).toHaveBeenCalledWith("npm install")
  })

  it("shows the copied state, then returns to copy", async () => {
    vi.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(Copy, { props: { content: "npm install" } })

    const button = screen.getByRole("button", { name: "Copy code snippet" })
    await user.click(button)
    expect(button).toHaveAttribute("title", "Copied")

    await vi.advanceTimersByTimeAsync(2500)
    expect(button).toHaveAttribute("title", "Copy")
  })

  it("renders the mini variant with a smaller icon", () => {
    render(Copy, { props: { content: "npm install", variant: "mini" } })

    expect(
      screen.getByRole("button", { name: "Copy code snippet" }).querySelector("svg"),
    ).toHaveClass("size-3.5")
  })

  it("renders consumer children instead of the icons", () => {
    render(Copy, { props: { content: "npm install", children: textSnippet("Kopyala") } })

    expect(screen.getByText("Kopyala")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Copy code snippet" }).querySelector("svg"),
    ).toBeNull()
  })

  it("merges a consumer class with the base classes", () => {
    render(Copy, { props: { content: "npm install", class: "text-fg-error custom-class" } })

    expect(screen.getByRole("button", { name: "Copy code snippet" })).toHaveClass(
      "text-fg-error",
      "custom-class",
    )
  })
})
