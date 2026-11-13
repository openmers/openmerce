import { render, screen } from "@testing-library/svelte"
import { describe, expect, it } from "vitest"
import Skeleton from "./Skeleton.svelte"

describe("Skeleton", () => {
  it("renders a pulsing placeholder", () => {
    render(Skeleton, { props: { "data-testid": "skeleton" } })

    expect(screen.getByTestId("skeleton")).toHaveClass("animate-pulse", "rounded-md", "bg-popover")
  })

  it("passes rest props and merges a consumer class", () => {
    render(Skeleton, { props: { "data-testid": "skeleton", class: "h-4 w-24" } })

    const skeleton = screen.getByTestId("skeleton")
    expect(skeleton).toHaveAttribute("data-testid", "skeleton")
    expect(skeleton).toHaveClass("h-4", "w-24", "animate-pulse")
  })
})
