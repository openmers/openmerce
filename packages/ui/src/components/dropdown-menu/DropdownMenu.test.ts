import { render, screen, waitFor } from "@testing-library/svelte"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import DropdownMenuExample from "./fixtures/DropdownMenuExample.svelte"

const menu = () => document.querySelector<HTMLElement>("[data-dropdown-menu-content]")

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "İşlemler" }))
  await waitFor(() => expect(menu()).not.toBeNull())
}

describe("DropdownMenu", () => {
  it("renders a closed menu with a trigger", () => {
    render(DropdownMenuExample)

    expect(screen.getByRole("button", { name: "İşlemler" })).toBeInTheDocument()
    expect(menu()).toBeNull()
  })

  it("opens on click and applies the Medusa content styles", async () => {
    const user = userEvent.setup()
    render(DropdownMenuExample)

    await openMenu(user)

    expect(menu()).toHaveClass("bg-popover", "text-foreground", "rounded-lg", "p-1")
    expect(menu()).toHaveClass("shadow-elevation-flyout", "min-w-[220px]")
  })

  it("renders items with the item styles and a disabled item", async () => {
    const user = userEvent.setup()
    render(DropdownMenuExample)

    await openMenu(user)

    const item = screen.getByText("Kopyala")
    expect(item).toHaveClass("bg-popover", "txt-compact-small", "rounded-md", "px-2", "py-1.5")
    expect(item).toHaveClass("focus-visible:bg-bg-component-hover")

    const disabled = screen.getByText("Arşivle")
    expect(disabled).toHaveAttribute("data-disabled")
    expect(disabled).toHaveClass("data-[disabled]:text-fg-disabled")
  })

  it("selects an item, calls onSelect and closes the menu", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(DropdownMenuExample, { props: { onSelect } })

    await openMenu(user)
    await user.click(screen.getByText("Kopyala"))

    expect(onSelect).toHaveBeenCalledOnce()
    await waitFor(() => expect(menu()).toBeNull())
  })

  it("toggles the checkbox item and reports the change", async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()
    render(DropdownMenuExample, { props: { onCheckedChange } })

    await openMenu(user)
    const checkboxItem = screen.getByText("Yayında")
    expect(checkboxItem).toHaveAttribute("data-state", "unchecked")
    expect(checkboxItem).toHaveClass("data-[state=checked]:txt-compact-small-plus")

    await user.click(checkboxItem)
    expect(onCheckedChange).toHaveBeenCalledWith(true)
    expect(checkboxItem).toHaveAttribute("data-state", "checked")
  })

  it("selects a radio item inside the radio group", async () => {
    const user = userEvent.setup()
    render(DropdownMenuExample)

    await openMenu(user)
    expect(screen.getByText("Günlük")).toHaveAttribute("data-state", "checked")

    await user.click(screen.getByText("Haftalık"))
    // Seçim menüyü kapatır; yeniden açıp yeni seçimin kalıcı olduğunu doğrularız.
    await waitFor(() => expect(menu()).toBeNull())
    await openMenu(user)
    expect(screen.getByText("Haftalık")).toHaveAttribute("data-state", "checked")
  })

  it("renders the label, separator and shortcut styles", async () => {
    const user = userEvent.setup()
    render(DropdownMenuExample)

    await openMenu(user)
    expect(screen.getByText("Düzenle")).toHaveClass(
      "txt-compact-xsmall-plus",
      "text-muted-foreground",
    )
    expect(screen.getByText("⌘K")).toHaveClass("txt-compact-small", "ml-auto", "tracking-widest")

    const separator = menu()?.querySelector("[data-dropdown-menu-separator]")
    expect(separator).toHaveClass("-mx-1", "my-1", "h-0.5", "border-t", "border-b")
  })

  it("opens with the keyboard and closes with Escape", async () => {
    const user = userEvent.setup()
    render(DropdownMenuExample)

    const trigger = screen.getByRole("button", { name: "İşlemler" })
    trigger.focus()
    await user.keyboard("{ArrowDown}")
    await waitFor(() => expect(menu()).not.toBeNull())

    await user.keyboard("{Escape}")
    await waitFor(() => expect(menu()).toBeNull())
  })
})
