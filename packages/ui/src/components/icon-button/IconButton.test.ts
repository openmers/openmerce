import { render, screen } from "@testing-library/svelte"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { textSnippet } from "../../test/snippet"
import IconButton from "./IconButton.svelte"

const icon = textSnippet('<svg aria-hidden="true"></svg>')

const variantClasses = [
  [
    "primary",
    [
      "bg-secondary",
      "text-muted-foreground",
      "shadow-buttons-neutral",
      "hover:bg-button-neutral-hover",
      "active:bg-button-neutral-pressed",
      "focus-visible:shadow-buttons-neutral-focus",
    ],
  ],
  [
    "transparent",
    [
      "bg-button-transparent",
      "text-muted-foreground",
      "hover:bg-button-transparent-hover",
      "active:bg-button-transparent-pressed",
      "focus-visible:bg-card",
    ],
  ],
] as const

const sizeClasses = [
  ["2xsmall", ["h-5", "w-5"]],
  ["xsmall", ["h-6", "w-6", "p-1"]],
  ["small", ["h-7", "w-7", "p-1"]],
  ["base", ["h-8", "w-8", "p-1.5"]],
  ["large", ["h-10", "w-10", "p-2.5"]],
  ["xlarge", ["h-12", "w-12", "p-3.5"]],
] as const

describe("IconButton", () => {
  it("renders a button with its accessible name and default variant", () => {
    render(IconButton, { props: { "aria-label": "Close", children: icon } })

    const button = screen.getByRole("button", { name: "Close" })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass("bg-secondary", "h-8", "w-8")
  })

  it.each(variantClasses)("applies the %s variant classes", (variant, classes) => {
    render(IconButton, { props: { variant, "aria-label": "Close", children: icon } })

    expect(screen.getByRole("button", { name: "Close" })).toHaveClass(...classes)
  })

  it.each(sizeClasses)("applies the %s size classes", (size, classes) => {
    render(IconButton, { props: { size, "aria-label": "Close", children: icon } })

    expect(screen.getByRole("button", { name: "Close" })).toHaveClass(...classes)
  })

  it("activates with the keyboard", async () => {
    const user = userEvent.setup()
    const onclick = vi.fn()
    render(IconButton, { props: { onclick, "aria-label": "Close", children: icon } })

    await user.tab()
    const button = screen.getByRole("button", { name: "Close" })
    expect(button).toHaveFocus()

    await user.keyboard("{Enter}")
    expect(onclick).toHaveBeenCalledOnce()
  })

  it("does not fire when disabled", async () => {
    const user = userEvent.setup()
    const onclick = vi.fn()
    render(IconButton, {
      props: { disabled: true, onclick, "aria-label": "Close", children: icon },
    })

    const button = screen.getByRole("button", { name: "Close" })
    expect(button).toBeDisabled()

    await user.click(button)
    expect(onclick).not.toHaveBeenCalled()
  })

  it("shows a spinner, sets aria-busy and disables while loading", async () => {
    const user = userEvent.setup()
    const onclick = vi.fn()
    render(IconButton, {
      props: { isLoading: true, onclick, "aria-label": "Close", children: icon },
    })

    const button = screen.getByRole("button", { name: "Close" })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute("aria-busy", "true")
    expect(button.querySelector("svg.animate-spin")).toBeInTheDocument()

    await user.click(button)
    expect(onclick).not.toHaveBeenCalled()
  })

  it("passes rest props to the underlying button", () => {
    render(IconButton, {
      props: { type: "submit", "data-testid": "icon", "aria-label": "Close", children: icon },
    })

    expect(screen.getByTestId("icon")).toHaveAttribute("type", "submit")
  })

  it("merges a consumer class with the variant classes", () => {
    render(IconButton, {
      props: { class: "h-12 custom-class", "aria-label": "Close", children: icon },
    })

    const button = screen.getByRole("button", { name: "Close" })
    expect(button).toHaveClass("h-12", "custom-class")
    expect(button).not.toHaveClass("h-8")
  })
})
