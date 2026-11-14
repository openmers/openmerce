import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { Input } from "./Input"

describe("Input", () => {
  it("renders a textbox with the default size classes", () => {
    render(<Input aria-label="Email" />)

    const input = screen.getByRole("textbox", { name: "Email" })
    expect(input).toHaveClass("txt-compact-small", "h-8", "px-2", "py-1.5")
    expect(input).toHaveClass("bg-bg-field", "shadow-borders-base", "rounded-md")
  })

  it("applies the small size classes", () => {
    render(<Input size="small" aria-label="Email" />)

    expect(screen.getByRole("textbox")).toHaveClass("h-7", "px-2", "py-1")
  })

  it("accepts typed text", async () => {
    const user = userEvent.setup()
    render(<Input aria-label="Email" />)

    await user.type(screen.getByRole("textbox"), "a@b.co")
    expect(screen.getByRole("textbox")).toHaveValue("a@b.co")
  })

  it("shows a search icon and left padding for search inputs", () => {
    render(<Input type="search" aria-label="Search" />)

    expect(screen.getByRole("searchbox")).toHaveClass("pl-8")
    expect(screen.getByRole("img")).toHaveClass("h-8", "w-8")
  })

  it("toggles password visibility", async () => {
    const user = userEvent.setup()
    render(<Input type="password" aria-label="Password" />)

    const input = screen.getByLabelText("Password")
    expect(input).toHaveAttribute("type", "password")
    expect(input).toHaveClass("pr-8")

    await user.click(screen.getByRole("button", { name: "Show password" }))
    expect(input).toHaveAttribute("type", "text")

    await user.click(screen.getByRole("button", { name: "Hide password" }))
    expect(input).toHaveAttribute("type", "password")
  })

  it("passes rest props and merges a consumer class", () => {
    render(<Input placeholder="name@example.com" disabled className="h-10 custom-class" />)

    const input = screen.getByPlaceholderText("name@example.com")
    expect(input).toBeDisabled()
    expect(input).toHaveClass("h-10", "custom-class")
    expect(input).not.toHaveClass("h-8")
  })
})
