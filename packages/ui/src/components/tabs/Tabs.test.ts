import { render, screen } from "@testing-library/svelte"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import TabsExample from "./fixtures/TabsExample.svelte"

describe("Tabs", () => {
  it("renders a tablist with the active tab and its panel", () => {
    render(TabsExample)

    expect(screen.getByRole("tablist")).toHaveClass("flex", "items-center", "gap-2")
    expect(screen.getByRole("tab", { name: "Genel" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Genel içerik")
  })

  it("applies the trigger styles, including the active state", () => {
    render(TabsExample)

    const trigger = screen.getByRole("tab", { name: "Genel" })
    expect(trigger).toHaveClass(
      "txt-compact-small-plus",
      "rounded-full",
      "px-2.5",
      "py-1",
      "text-muted-foreground",
    )
    expect(trigger).toHaveClass(
      "data-[state=active]:bg-card",
      "data-[state=active]:shadow-elevation-card-rest",
    )
  })

  it("switches the panel when another tab is clicked", async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(TabsExample, { props: { onValueChange } })

    await user.click(screen.getByRole("tab", { name: "Fiyat" }))

    expect(screen.getByRole("tab", { name: "Fiyat" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Fiyat içerik")
    expect(onValueChange).toHaveBeenCalledWith("fiyat")
  })

  it("moves between tabs with the arrow keys", async () => {
    const user = userEvent.setup()
    render(TabsExample)

    await user.click(screen.getByRole("tab", { name: "Genel" }))
    await user.keyboard("{ArrowRight}")

    expect(screen.getByRole("tab", { name: "Fiyat" })).toHaveAttribute("aria-selected", "true")
  })

  it("skips a disabled tab", async () => {
    const user = userEvent.setup()
    render(TabsExample)

    const disabled = screen.getByRole("tab", { name: "Stok" })
    expect(disabled).toHaveAttribute("data-disabled")

    await user.click(disabled)
    expect(disabled).toHaveAttribute("aria-selected", "false")
  })

  it("merges a consumer class on the list and applies rest props", () => {
    render(TabsExample, { props: { listClass: "gap-4" } })

    const list = screen.getByRole("tablist", { name: "Sekmeler" })
    expect(list).toHaveClass("gap-4")
    expect(list).not.toHaveClass("gap-2")
  })
})
