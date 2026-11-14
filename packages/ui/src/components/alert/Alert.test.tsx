import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { Alert } from "./Alert"

const variantClasses = [
  ["info", "text-tag-neutral-icon"],
  ["error", "text-tag-red-icon"],
  ["success", "text-tag-green-icon"],
  ["warning", "text-tag-orange-icon"],
] as const

describe("Alert", () => {
  it("renders an informational alert with its content", () => {
    const { container } = render(<Alert>Heads up</Alert>)

    const alert = container.firstElementChild
    expect(alert).toHaveClass("txt-compact-small", "bg-background", "rounded-lg", "p-3")
    expect(alert).toHaveClass("grid-cols-[20px_1fr]")
    expect(alert?.querySelector("svg")).toHaveClass("text-tag-neutral-icon")
  })

  it.each(variantClasses)("applies the %s icon color", (variant, className) => {
    render(<Alert variant={variant}>Heads up</Alert>)

    const icon = document.querySelector("svg")
    expect(icon).toHaveClass(className)
  })

  it("reserves a dismiss column when dismissible", () => {
    const { container } = render(<Alert dismissible>Heads up</Alert>)

    const alert = container.firstElementChild
    expect(alert).toHaveClass("grid-cols-[20px_1fr_20px]")
  })

  it("hides itself after the dismiss button is used", async () => {
    const user = userEvent.setup()
    render(<Alert dismissible>Heads up</Alert>)

    await user.click(screen.getByRole("button", { name: "Dismiss" }))

    expect(screen.queryByText("Heads up")).not.toBeInTheDocument()
  })

  it("passes rest props and merges a consumer class", () => {
    render(
      <Alert data-testid="alert" className="mt-2 custom-class">
        Hi
      </Alert>,
    )

    expect(screen.getByTestId("alert")).toHaveClass("mt-2", "custom-class")
  })
})
