import { render, screen } from "@testing-library/svelte"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import RadioGroupExample from "./fixtures/RadioGroupExample.svelte"
import RadioGroup from "./RadioGroup.svelte"

describe("RadioGroup", () => {
  it("renders a radiogroup with its items", () => {
    render(RadioGroupExample)

    expect(screen.getByRole("radiogroup", { name: "Renk" })).toHaveClass("grid", "gap-2")
    expect(screen.getAllByRole("radio")).toHaveLength(4)
    expect(screen.getByRole("radio", { name: "Kırmızı" })).toBeChecked()
  })

  it("applies the item and indicator classes, including the checked state", () => {
    render(RadioGroupExample)

    const item = screen.getByRole("radio", { name: "Kırmızı" })
    expect(item).toHaveClass("group", "h-5", "w-5", "outline-hidden")
    expect(item).toHaveAttribute("data-state", "checked")

    const indicator = item.querySelector("[data-indicator]") as HTMLElement
    expect(indicator).toHaveClass("bg-card", "rounded-full")
    expect(indicator).toHaveClass("group-data-[state=checked]:bg-bg-interactive")
    expect(indicator.querySelector(".h-1\\.5")).toBeInTheDocument()
  })

  it("selects a radio item on click", async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(RadioGroupExample, { props: { onValueChange } })

    await user.click(screen.getByRole("radio", { name: "Mavi" }))

    expect(screen.getByRole("radio", { name: "Mavi" })).toBeChecked()
    expect(screen.getByRole("radio", { name: "Kırmızı" })).not.toBeChecked()
    expect(onValueChange).toHaveBeenCalledWith("b")
  })

  it("moves the selection with the arrow keys", async () => {
    const user = userEvent.setup()
    render(RadioGroupExample)

    await user.click(screen.getByRole("radio", { name: "Kırmızı" }))
    await user.keyboard("{ArrowDown}")

    expect(screen.getByRole("radio", { name: "Mavi" })).toBeChecked()
  })

  it("does not select a disabled item", async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(RadioGroupExample, { props: { onValueChange } })

    const disabled = screen.getByRole("radio", { name: "Yeşil" })
    expect(disabled).toHaveAttribute("data-disabled")
    expect(disabled.querySelector("[data-indicator]")).toHaveClass("group-disabled:opacity-50")

    await user.click(disabled)
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it("renders the choice box with a label and description", () => {
    render(RadioGroupExample)

    const choiceBox = screen.getByRole("radio", { name: /Turuncu/ })
    expect(choiceBox).toHaveClass("rounded-lg", "p-3", "shadow-borders-base")
    expect(choiceBox).toHaveAttribute("aria-describedby")
    expect(screen.getByText("Sıcak renk")).toHaveClass("txt-small", "text-muted-foreground")
  })

  it("merges a consumer class and passes rest props on the root", () => {
    render(RadioGroup, { props: { class: "gap-4", "aria-label": "Grup" } })

    const group = screen.getByRole("radiogroup", { name: "Grup" })
    expect(group).toHaveClass("gap-4")
    expect(group).not.toHaveClass("gap-2")
  })
})
