import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { SelectExample } from "./fixtures/SelectExample"

const content = () => document.querySelector<HTMLElement>("[data-select-content]")

const option = (name: string) => {
  const items = [...document.querySelectorAll<HTMLElement>("[data-select-item]")]
  return items.find((item) => item.textContent?.trim() === name)
}

async function openSelect(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("combobox", { name: "Bölge" }))
  await waitFor(() => expect(content()).not.toBeNull())
}

describe("Select", () => {
  it("renders a combobox trigger with the placeholder", () => {
    render(<SelectExample />)

    const trigger = screen.getByRole("combobox", { name: "Bölge" })
    expect(trigger).toHaveTextContent("Bölge seç")
    expect(trigger).toHaveClass("bg-bg-field", "rounded-md", "h-8", "px-2", "py-1.5")
    expect(trigger).toHaveClass("shadow-buttons-neutral", "txt-compact-small")
    expect(content()).toBeNull()
  })

  it("applies the small trigger size and its disabled state", () => {
    render(<SelectExample size="small" disabled />)

    const trigger = screen.getByRole("combobox", { name: "Bölge" })
    expect(trigger).toHaveClass("h-7", "py-1")
    expect(trigger).toHaveAttribute("data-disabled")
    expect(trigger).toHaveClass("disabled:!bg-muted")
  })

  it("opens the content with the kit styles", async () => {
    const user = userEvent.setup()
    render(<SelectExample />)

    await openSelect(user)

    expect(content()).toHaveClass("bg-popover", "text-foreground", "rounded-lg")
    expect(content()).toHaveClass("shadow-elevation-flyout", "max-h-[200px]")
    expect(screen.getByText("Avrupa")).toHaveClass(
      "txt-compact-xsmall-plus",
      "text-muted-foreground",
    )
  })

  it("renders items with their styles and marks the selected one", async () => {
    const user = userEvent.setup()
    render(<SelectExample defaultValue="de" />)

    await openSelect(user)

    const selected = option("Almanya") as HTMLElement
    expect(selected).toHaveAttribute("data-state", "checked")
    expect(selected).toHaveAttribute("aria-selected", "true")
    expect(selected).toHaveClass("txt-compact-small", "grid", "rounded-[4px]", "px-2", "py-1.5")
    expect(selected).toHaveClass("data-[state=checked]:txt-compact-small-plus")
    expect(option("Türkiye")).toHaveAttribute("data-state", "unchecked")
  })

  it("selects an option, reports it and updates the trigger label", async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<SelectExample onValueChange={onValueChange} />)

    await openSelect(user)
    await user.click(option("Türkiye") as HTMLElement)

    expect(onValueChange).toHaveBeenCalledWith("tr")
    await waitFor(() => expect(content()).toBeNull())
    expect(screen.getByRole("combobox", { name: "Bölge" })).toHaveTextContent("Türkiye")
  })

  it("does not select a disabled option", async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<SelectExample onValueChange={onValueChange} />)

    await openSelect(user)
    const disabled = option("Japonya") as HTMLElement
    expect(disabled).toHaveAttribute("data-disabled")

    await user.click(disabled)
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it("navigates and selects with the keyboard", async () => {
    const user = userEvent.setup()
    render(<SelectExample />)

    await user.click(screen.getByRole("combobox", { name: "Bölge" }))
    await waitFor(() => expect(content()).not.toBeNull())

    await user.keyboard("{ArrowDown}{Enter}")
    await waitFor(() => expect(content()).toBeNull())
    expect(screen.getByRole("combobox", { name: "Bölge" })).toHaveTextContent("Almanya")
  })

  it("renders the separator with the menu border classes", async () => {
    const user = userEvent.setup()
    render(<SelectExample />)

    await openSelect(user)

    const separator = content()?.querySelector("div.h-0\\.5")
    expect(separator).toHaveClass("-mx-1", "my-1", "h-0.5", "border-t", "border-b")
  })
})
