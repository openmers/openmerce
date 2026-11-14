import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { Button } from "./Button"

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
    render(<Button>Save</Button>)

    const button = screen.getByRole("button", { name: "Save" })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass("bg-primary", "px-3", "py-1.5")
  })

  it.each(variantClasses)("applies the %s variant classes", (variant, classes) => {
    render(<Button variant={variant}>Save</Button>)

    expect(screen.getByRole("button", { name: "Save" })).toHaveClass(...classes)
  })

  it.each(sizeClasses)("applies the %s size classes", (size, classes) => {
    render(<Button size={size}>Save</Button>)

    expect(screen.getByRole("button", { name: "Save" })).toHaveClass(...classes)
  })

  it("activates with the keyboard", async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save</Button>)

    await user.tab()
    const button = screen.getByRole("button", { name: "Save" })
    expect(button).toHaveFocus()

    await user.keyboard("{Enter}")
    expect(onClick).toHaveBeenCalledOnce()
  })

  it("does not fire when disabled", async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    )

    const button = screen.getByRole("button", { name: "Save" })
    expect(button).toBeDisabled()

    await user.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it("shows a spinner, sets aria-busy and disables while loading", async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <Button isLoading onClick={onClick}>
        Save
      </Button>,
    )

    const button = screen.getByRole("button", { name: "Save" })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute("aria-busy", "true")
    expect(button.querySelector("svg")).toHaveClass("animate-spin")

    await user.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it("passes rest props to the underlying button", () => {
    render(
      <Button type="submit" form="checkout" data-testid="save">
        Save
      </Button>,
    )

    const button = screen.getByTestId("save")
    expect(button).toHaveAttribute("type", "submit")
    expect(button).toHaveAttribute("form", "checkout")
  })

  it("merges a consumer class with the variant classes", () => {
    render(<Button className="px-8 custom-class">Save</Button>)

    const button = screen.getByRole("button", { name: "Save" })
    expect(button).toHaveClass("px-8", "custom-class")
    expect(button).not.toHaveClass("px-3")
  })
})
