import { render, screen } from "@testing-library/svelte"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import Switch from "./Switch.svelte"

describe("Switch", () => {
  it("renders an unchecked switch with the base size", () => {
    render(Switch, { props: { "aria-label": "Bildirimler" } })

    const root = screen.getByRole("switch", { name: "Bildirimler" })
    expect(root).not.toBeChecked()
    expect(root).toHaveClass("h-[18px]", "w-[32px]", "bg-bg-switch-off", "rounded-full")
    expect(root.querySelector("span")).toHaveClass("h-[14px]", "w-[14px]")
  })

  it("applies the small size classes to root and thumb", () => {
    render(Switch, { props: { "aria-label": "Bildirimler", size: "small" } })

    const root = screen.getByRole("switch", { name: "Bildirimler" })
    expect(root).toHaveClass("h-[16px]", "w-[28px]")
    const thumb = root.querySelector("span") as HTMLElement
    expect(thumb).toHaveClass("h-[12px]", "w-[12px]", "data-[state=checked]:translate-x-3.5")
  })

  it("toggles on click and reports the change", async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()
    render(Switch, { props: { "aria-label": "Bildirimler", onCheckedChange } })

    await user.click(screen.getByRole("switch", { name: "Bildirimler" }))

    expect(onCheckedChange).toHaveBeenCalledWith(true)
    expect(screen.getByRole("switch", { name: "Bildirimler" })).toBeChecked()
  })

  it("toggles with the keyboard", async () => {
    const user = userEvent.setup()
    render(Switch, { props: { "aria-label": "Bildirimler" } })

    await user.tab()
    const root = screen.getByRole("switch", { name: "Bildirimler" })
    expect(root).toHaveFocus()

    await user.keyboard("{Enter}")
    expect(root).toBeChecked()
  })

  it("keeps the checked styling hooks on the thumb", () => {
    render(Switch, { props: { "aria-label": "Bildirimler", checked: true } })

    const root = screen.getByRole("switch", { name: "Bildirimler" })
    expect(root).toHaveClass("data-[state=checked]:bg-bg-interactive")
    const thumb = root.querySelector("span") as HTMLElement
    expect(thumb).toHaveAttribute("data-state", "checked")
    expect(thumb).toHaveClass("bg-fg-on-color", "shadow-details-switch-handle")
  })

  it("does not toggle when disabled", async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()
    render(Switch, { props: { "aria-label": "Bildirimler", disabled: true, onCheckedChange } })

    const root = screen.getByRole("switch", { name: "Bildirimler" })
    expect(root).toHaveAttribute("data-disabled")
    expect(root).toHaveClass("disabled:opacity-50")

    await user.click(root)
    expect(onCheckedChange).not.toHaveBeenCalled()
  })

  it("passes rest props and merges a consumer class", () => {
    render(Switch, {
      props: {
        "aria-label": "Bildirimler",
        name: "alerts",
        "data-testid": "alerts",
        class: "w-10",
      },
    })

    const root = screen.getByTestId("alerts")
    expect(root).toHaveClass("w-10")
    expect(root).not.toHaveClass("w-[32px]")
  })
})
