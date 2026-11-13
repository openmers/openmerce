import { render, screen } from "@testing-library/svelte"
import { describe, expect, it } from "vitest"
import { textSnippet } from "../../test/snippet"
import Command from "./Command.svelte"

describe("Command", () => {
  it("renders a code command bar with the Medusa styles", () => {
    render(Command, {
      props: { children: textSnippet("<code>pnpm install</code>") },
    })

    const command = screen.getByText("pnpm install").parentElement as HTMLElement
    expect(command).toHaveClass("flex", "items-center", "rounded-lg", "px-4", "py-1.5")
    expect(command).toHaveClass("bg-contrast-bg-base", "shadow-elevation-code-block")
    expect(command).toHaveClass("[&>code]:mx-2", "[&>code]:text-primary-foreground")
  })

  it("passes rest props and merges a consumer class", () => {
    render(Command, {
      props: { children: textSnippet("<code>npm i</code>"), "data-testid": "cmd", class: "px-6" },
    })

    const command = screen.getByTestId("cmd")
    expect(command).toHaveClass("px-6")
    expect(command).not.toHaveClass("px-4")
  })
})
