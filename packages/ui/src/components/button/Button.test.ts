import { render, screen } from "@testing-library/svelte"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { textSnippet } from "../../test/snippet"
import Button from "./Button.svelte"

const variantClasses = [
  [
    "primary",
    [
      "bg-primary",
      "text-primary-foreground",
      "shadow-buttons-inverted",
      "hover:bg-button-inverted-hover",
      "active:bg-button-inverted-pressed",
      "focus-visible:!shadow-buttons-inverted-focus",
    ],
  ],
  [
    "secondary",
    [
      "bg-secondary",
      "text-foreground",
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
      "hover:bg-button-transparent-hover",
      "active:bg-button-transparent-pressed",
      "disabled:!bg-transparent",
    ],
  ],
  [
    "danger",
    [
      "bg-destructive",
      "text-fg-on-color",
      "shadow-buttons-danger",
      "hover:bg-button-danger-hover",
      "active:bg-button-danger-pressed",
      "focus-visible:shadow-buttons-danger-focus",
    ],
  ],
] as const

const sizeClasses = [
  ["small", ["px-2", "py-1", "txt-compact-small-plus"]],
  ["base", ["px-3", "py-1.5", "txt-compact-small-plus"]],
  ["large", ["px-4", "py-2.5", "txt-compact-medium-plus"]],
  ["xlarge", ["px-5", "py-3.5", "txt-compact-large-plus"]],
] as const

describe("Button", () => {
  it("renders a button with its accessible name and default variant", () => {
    render(Button, { props: { children: textSnippet("Save") } })

    const button = screen.getByRole("button", { name: "Save" })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass("bg-primary", "px-3", "py-1.5")
  })

  it.each(variantClasses)("applies the %s variant classes", (variant, classes) => {
    render(Button, { props: { variant, children: textSnippet("Save") } })

    expect(screen.getByRole("button", { name: "Save" })).toHaveClass(...classes)
  })

  it.each(sizeClasses)("applies the %s size classes", (size, classes) => {
    render(Button, { props: { size, children: textSnippet("Save") } })

    expect(screen.getByRole("button", { name: "Save" })).toHaveClass(...classes)
  })

  it("activates with the keyboard", async () => {
    const user = userEvent.setup()
    const onclick = vi.fn()
    render(Button, { props: { onclick, children: textSnippet("Save") } })

    await user.tab()
    const button = screen.getByRole("button", { name: "Save" })
    expect(button).toHaveFocus()

    await user.keyboard("{Enter}")
    expect(onclick).toHaveBeenCalledOnce()
  })

  it("does not fire when disabled", async () => {
    const user = userEvent.setup()
    const onclick = vi.fn()
    render(Button, { props: { disabled: true, onclick, children: textSnippet("Save") } })

    const button = screen.getByRole("button", { name: "Save" })
    expect(button).toBeDisabled()

    await user.click(button)
    expect(onclick).not.toHaveBeenCalled()
  })

  it("shows a spinner, sets aria-busy and disables while loading", async () => {
    const user = userEvent.setup()
    const onclick = vi.fn()
    render(Button, { props: { isLoading: true, onclick, children: textSnippet("Save") } })

    const button = screen.getByRole("button", { name: "Save" })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute("aria-busy", "true")
    expect(button.querySelector("svg")).toHaveClass("animate-spin")

    await user.click(button)
    expect(onclick).not.toHaveBeenCalled()
  })

  it("passes rest props to the underlying button", () => {
    render(Button, {
      props: {
        type: "submit",
        form: "checkout",
        "data-testid": "save",
        children: textSnippet("Save"),
      },
    })

    const button = screen.getByTestId("save")
    expect(button).toHaveAttribute("type", "submit")
    expect(button).toHaveAttribute("form", "checkout")
  })

  it("merges a consumer class with the variant classes", () => {
    render(Button, { props: { class: "px-8 custom-class", children: textSnippet("Save") } })

    const button = screen.getByRole("button", { name: "Save" })
    expect(button).toHaveClass("px-8", "custom-class")
    expect(button).not.toHaveClass("px-3")
  })
})
