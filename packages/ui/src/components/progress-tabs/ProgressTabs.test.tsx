import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { ProgressTabsExample } from "./fixtures/ProgressTabsExample"

describe("ProgressTabs", () => {
  it("renders a tablist with the active panel", () => {
    render(<ProgressTabsExample />)

    expect(screen.getByRole("tablist")).toHaveClass("flex", "items-center")
    expect(screen.getByRole("tab", { name: /Genel/ })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Genel")
  })

  it("applies the trigger styles including the active state", () => {
    render(<ProgressTabsExample />)

    const trigger = screen.getByRole("tab", { name: /Fiyat/ })
    expect(trigger).toHaveClass("txt-compact-small-plus", "h-[52px]", "max-w-[200px]", "px-4")
    expect(trigger).toHaveClass("bg-background", "text-fg-muted", "border-r-border")
    expect(trigger).toHaveClass(
      "data-[state=active]:bg-card",
      "data-[state=active]:text-foreground",
    )
  })

  it("renders a status indicator per trigger", () => {
    render(<ProgressTabsExample />)

    const completed = screen.getByRole("tab", { name: /Genel/ }).querySelector("[data-status]")
    expect(completed).toHaveAttribute("data-status", "completed")
    expect(completed).toHaveClass(
      "text-fg-muted",
      "group-data-[state=active]/trigger:text-fg-interactive",
    )

    expect(
      screen.getByRole("tab", { name: /Fiyat/ }).querySelector("[data-status]"),
    ).toHaveAttribute("data-status", "in-progress")
    expect(
      screen.getByRole("tab", { name: /Stok/ }).querySelector("[data-status]"),
    ).toHaveAttribute("data-status", "not-started")
  })

  it("switches the panel and reports the change", async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<ProgressTabsExample onValueChange={onValueChange} />)

    await user.click(screen.getByRole("tab", { name: /Fiyat/ }))

    expect(onValueChange).toHaveBeenCalledWith("fiyat")
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Fiyat")
  })

  it("moves with the arrow keys and skips the disabled step", async () => {
    const user = userEvent.setup()
    render(<ProgressTabsExample />)

    await user.click(screen.getByRole("tab", { name: /Genel/ }))
    await user.keyboard("{ArrowRight}")
    expect(screen.getByRole("tab", { name: /Fiyat/ })).toHaveAttribute("aria-selected", "true")

    // The disabled "Stok" step is skipped and move wraps back to the start.
    await user.keyboard("{ArrowRight}")
    expect(screen.getByRole("tab", { name: /Genel/ })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("tab", { name: /Stok/ })).toHaveAttribute("aria-selected", "false")
  })

  it("marks the disabled step as disabled", () => {
    render(<ProgressTabsExample />)

    const disabled = screen.getByRole("tab", { name: /Stok/ })
    expect(disabled).toHaveAttribute("data-disabled")
    expect(disabled).toHaveClass("disabled:bg-muted", "disabled:text-fg-muted")
  })
})
