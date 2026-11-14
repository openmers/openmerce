import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { CommandBarExample } from "./fixtures/CommandBarExample"

const content = () => document.querySelector<HTMLElement>("[data-popover-content]")

describe("CommandBar", () => {
  it("renders nothing visible while closed", () => {
    render(<CommandBarExample />)

    expect(content()).toBeNull()
  })

  it("renders the bar, value, separator and commands when open", () => {
    render(<CommandBarExample open />)

    expect(content()).not.toBeNull()
    expect(screen.getByText("3 ürün seçildi")).toHaveClass(
      "txt-compact-small-plus",
      "px-3",
      "py-2.5",
      "text-contrast-fg-secondary",
    )

    const bar = screen.getByText("Sil").parentElement?.parentElement as HTMLElement
    expect(bar).toHaveClass("rounded-full", "bg-contrast-bg-base", "px-1")
    expect(bar).toHaveClass("after:shadow-elevation-flyout")
  })

  it("renders a command with label and shortcut kbd", () => {
    render(<CommandBarExample open />)

    const command = screen.getByRole("button", { name: /Sil/ })
    expect(command).toHaveClass("txt-compact-small-plus", "px-3", "py-2.5", "transition-fg")
    expect(command).toHaveClass("text-primary-foreground", "bg-contrast-bg-base")
    expect(command.querySelector("kbd")).toHaveClass(
      "border-contrast-border-base",
      "bg-contrast-bg-subtle",
      "text-contrast-fg-secondary",
    )
    expect(command.querySelector("kbd")).toHaveTextContent("D")
  })

  it("calls the action on click", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<CommandBarExample open onSelect={onSelect} />)

    await user.click(screen.getByRole("button", { name: /Arşivle/ }))
    expect(onSelect).toHaveBeenCalledOnce()
  })

  it("runs the action from its keyboard shortcut", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<CommandBarExample open onSelect={onSelect} />)

    await user.keyboard("d")
    expect(onSelect).toHaveBeenCalledOnce()
  })

  it("ignores the shortcut while typing in an input", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<CommandBarExample open onSelect={onSelect} />)

    const input = document.querySelector<HTMLInputElement>(
      "input[aria-label='Arama']",
    ) as HTMLInputElement
    input.focus()
    expect(input).toHaveFocus()

    await user.keyboard("d")
    expect(onSelect).not.toHaveBeenCalled()
  })

  it("blocks the click and the shortcut when disabled", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<CommandBarExample open onSelect={onSelect} disabled />)

    const button = screen.getByRole("button", { name: /Sil/ })
    expect(button).toBeDisabled()
    expect(button).toHaveClass("disabled:!text-fg-disabled")

    await user.click(button)
    expect(onSelect).not.toHaveBeenCalled()

    await user.keyboard("d")
    expect(onSelect).not.toHaveBeenCalled()
  })
})
