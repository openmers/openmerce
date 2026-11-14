import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Command } from "./Command"

describe("Command", () => {
  it("renders a code command bar with the kit styles", () => {
    render(
      <Command>
        <code>pnpm install</code>
      </Command>,
    )

    const command = screen.getByText("pnpm install").parentElement as HTMLElement
    expect(command).toHaveClass("flex", "items-center", "rounded-lg", "px-4", "py-1.5")
    expect(command).toHaveClass("bg-contrast-bg-base", "shadow-elevation-code-block")
    expect(command).toHaveClass("[&>code]:mx-2", "[&>code]:text-primary-foreground")
  })

  it("passes rest props and merges a consumer class", () => {
    render(
      <Command data-testid="cmd" className="px-6">
        <code>npm i</code>
      </Command>,
    )

    const command = screen.getByTestId("cmd")
    expect(command).toHaveClass("px-6")
    expect(command).not.toHaveClass("px-4")
  })
})
