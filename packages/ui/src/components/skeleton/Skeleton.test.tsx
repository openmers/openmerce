import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Skeleton } from "./Skeleton"

describe("Skeleton", () => {
  it("renders a pulsing placeholder", () => {
    render(<Skeleton data-testid="skeleton" />)

    expect(screen.getByTestId("skeleton")).toHaveClass("animate-pulse", "rounded-md", "bg-popover")
  })

  it("passes rest props and merges a consumer class", () => {
    render(<Skeleton data-testid="skeleton" className="h-4 w-24" />)

    const skeleton = screen.getByTestId("skeleton")
    expect(skeleton).toHaveAttribute("data-testid", "skeleton")
    expect(skeleton).toHaveClass("h-4", "w-24", "animate-pulse")
  })
})
