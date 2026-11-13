import { render, screen } from "@testing-library/svelte"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import Checkbox from "./Checkbox.svelte"

const indicator = (root: HTMLElement) => root.querySelector("[data-indicator]") as HTMLElement

describe("Checkbox", () => {
  it("renders an unchecked checkbox by default", () => {
    render(Checkbox, { props: { "aria-label": "Kabul et" } })

    const checkbox = screen.getByRole("checkbox", { name: "Kabul et" })
    expect(checkbox).not.toBeChecked()
    expect(checkbox).toHaveAttribute("data-state", "unchecked")
    expect(indicator(checkbox)).toHaveClass("bg-card", "shadow-borders-base")
  })

  it("applies the interactive classes when checked", () => {
    render(Checkbox, { props: { "aria-label": "Kabul et", checked: true } })

    const checkbox = screen.getByRole("checkbox", { name: "Kabul et" })
    expect(checkbox).toBeChecked()
    expect(checkbox).toHaveAttribute("data-state", "checked")
    expect(indicator(checkbox)).toHaveClass("group-data-[state=checked]:bg-bg-interactive")
    expect(indicator(checkbox)?.querySelector("svg")).toBeInTheDocument()
  })

  it("shows a minus icon in the indeterminate state", () => {
    render(Checkbox, { props: { "aria-label": "Kabul et", indeterminate: true } })

    const checkbox = screen.getByRole("checkbox", { name: "Kabul et" })
    expect(checkbox).toHaveAttribute("data-state", "indeterminate")
    expect(indicator(checkbox)).toHaveClass("group-data-[state=indeterminate]:bg-bg-interactive")
    expect(indicator(checkbox)?.querySelector("svg")).toBeInTheDocument()
  })

  it("toggles with a click and reports the change", async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()
    render(Checkbox, { props: { "aria-label": "Kabul et", onCheckedChange } })

    await user.click(screen.getByRole("checkbox", { name: "Kabul et" }))

    expect(onCheckedChange).toHaveBeenCalledWith(true)
    expect(screen.getByRole("checkbox", { name: "Kabul et" })).toHaveAttribute(
      "data-state",
      "checked",
    )
  })

  it("toggles with the keyboard", async () => {
    const user = userEvent.setup()
    render(Checkbox, { props: { "aria-label": "Kabul et" } })

    await user.tab()
    const checkbox = screen.getByRole("checkbox", { name: "Kabul et" })
    expect(checkbox).toHaveFocus()

    await user.keyboard(" ")
    expect(checkbox).toHaveAttribute("data-state", "checked")
  })

  it("does not fire when disabled", async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()
    render(Checkbox, { props: { "aria-label": "Kabul et", disabled: true, onCheckedChange } })

    const checkbox = screen.getByRole("checkbox", { name: "Kabul et" })
    expect(checkbox).toHaveAttribute("data-disabled")
    expect(indicator(checkbox)).toHaveClass("group-disabled:opacity-50")

    await user.click(checkbox)
    expect(onCheckedChange).not.toHaveBeenCalled()
  })

  it("passes rest props and merges a consumer class", () => {
    render(Checkbox, {
      props: { "aria-label": "Kabul et", title: "Onay", "data-testid": "terms", class: "h-6" },
    })

    const checkbox = screen.getByTestId("terms")
    expect(checkbox).toHaveAttribute("title", "Onay")
    expect(checkbox).toHaveClass("h-6")
    expect(checkbox).not.toHaveClass("h-5")
  })
})
