import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { CurrencyInput } from "./CurrencyInput"

describe("CurrencyInput", () => {
  it("renders the currency code and symbol around a textbox", () => {
    render(<CurrencyInput symbol="$" code="usd" aria-label="Amount" />)

    const input = screen.getByRole("textbox", { name: "Amount" })
    expect(input).toHaveClass("text-right", "bg-transparent", "flex-1")
    expect(screen.getByText("usd")).toHaveClass("uppercase", "text-fg-muted")
    expect(screen.getByText("$")).toHaveClass("text-fg-muted")
  })

  it("focuses the input when the wrapper is clicked", async () => {
    const user = userEvent.setup()
    render(<CurrencyInput symbol="$" code="usd" aria-label="Amount" />)

    const wrapper = screen.getByText("usd").closest("div")
    await user.click(wrapper as HTMLElement)

    expect(screen.getByRole("textbox")).toHaveFocus()
  })

  it("applies the base and small size paddings", () => {
    const { unmount } = render(<CurrencyInput symbol="$" code="usd" aria-label="Amount" />)
    expect(screen.getByText("usd").parentElement).toHaveClass("py-[9px]")
    unmount()

    render(<CurrencyInput symbol="$" code="usd" size="small" aria-label="Amount" />)
    expect(screen.getByText("usd").parentElement).toHaveClass("py-[5px]")
  })

  it("renders the disabled styles", () => {
    render(<CurrencyInput symbol="$" code="usd" disabled aria-label="Amount" />)

    const input = screen.getByRole("textbox")
    expect(input).toBeDisabled()
    expect(input.parentElement).toHaveClass("!bg-muted", "cursor-not-allowed", "text-fg-disabled")
  })

  it("renders the error shadow when aria-invalid is set", () => {
    render(<CurrencyInput symbol="$" code="usd" aria-invalid aria-label="Amount" />)

    expect(screen.getByRole("textbox").parentElement).toHaveClass("!shadow-borders-error")
  })

  it("accepts typed values and forwards rest props", async () => {
    const user = userEvent.setup()
    render(<CurrencyInput symbol="$" code="usd" required aria-label="Amount" />)

    const input = screen.getByRole("textbox")
    await user.type(input, "12.50")

    expect(input).toHaveValue("12.50")
    expect(input).toBeRequired()
  })
})
