import { render, screen } from "@testing-library/svelte"
import { describe, expect, it } from "vitest"
import Divider from "./Divider.svelte"

describe("Divider", () => {
  it("renders a horizontal solid separator by default", () => {
    render(Divider)

    const divider = screen.getByRole("separator")
    expect(divider).toHaveAttribute("aria-orientation", "horizontal")
    expect(divider).toHaveClass("w-full", "border-t")
    expect(divider).not.toHaveClass("border-l")
  })

  it("renders a vertical solid separator", () => {
    render(Divider, { props: { orientation: "vertical" } })

    const divider = screen.getByRole("separator")
    expect(divider).toHaveAttribute("aria-orientation", "vertical")
    expect(divider).toHaveClass("h-full", "border-l")
    expect(divider).not.toHaveClass("border-t")
  })

  it("renders a horizontal dashed separator with a gradient", () => {
    render(Divider, { props: { variant: "dashed" } })

    const divider = screen.getByRole("separator")
    expect(divider).toHaveClass("bg-transparent", "h-px", "bg-[length:4px_1px]")
    expect(divider).not.toHaveClass("border-t")
  })

  it("renders a vertical dashed separator with a gradient", () => {
    render(Divider, { props: { variant: "dashed", orientation: "vertical" } })

    expect(screen.getByRole("separator")).toHaveClass(
      "bg-transparent",
      "w-px",
      "bg-[length:1px_4px]",
    )
  })

  it("passes rest props and merges a consumer class", () => {
    render(Divider, { props: { "data-testid": "divider", class: "my-4 custom-class" } })

    const divider = screen.getByTestId("divider")
    expect(divider).toHaveClass("my-4", "custom-class", "border-border")
  })
})
