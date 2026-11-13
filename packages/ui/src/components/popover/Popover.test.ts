import { render, screen, waitFor } from "@testing-library/svelte"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import PopoverExample from "./fixtures/PopoverExample.svelte"

const content = () => document.querySelector<HTMLElement>("[data-popover-content]")

describe("Popover", () => {
  it("renders a closed popover with a trigger", () => {
    render(PopoverExample)

    expect(screen.getByRole("button", { name: "Filtreler" })).toBeInTheDocument()
    expect(content()).toBeNull()
  })

  it("opens on click and applies the Medusa content styles", async () => {
    const user = userEvent.setup()
    render(PopoverExample)

    await user.click(screen.getByRole("button", { name: "Filtreler" }))

    await waitFor(() => expect(content()).not.toBeNull())
    expect(content()).toHaveClass("bg-card", "text-foreground", "rounded-lg", "p-1")
    expect(content()).toHaveClass("shadow-elevation-flyout", "min-w-[220px]")
    expect(screen.getByText("Durum: aktif")).toBeInTheDocument()
  })

  it("closes through the close part", async () => {
    const user = userEvent.setup()
    render(PopoverExample)

    await user.click(screen.getByRole("button", { name: "Filtreler" }))
    await waitFor(() => expect(content()).not.toBeNull())

    await user.click(screen.getByText("Kapat"))
    await waitFor(() => expect(content()).toBeNull())
  })

  it("closes with Escape", async () => {
    const user = userEvent.setup()
    render(PopoverExample)

    await user.click(screen.getByRole("button", { name: "Filtreler" }))
    await waitFor(() => expect(content()).not.toBeNull())

    await user.keyboard("{Escape}")
    await waitFor(() => expect(content()).toBeNull())
  })

  it("renders the separator with its own styles", async () => {
    const user = userEvent.setup()
    render(PopoverExample)

    await user.click(screen.getByRole("button", { name: "Filtreler" }))
    await waitFor(() => expect(content()).not.toBeNull())

    const separator = content()?.querySelector("div")
    expect(separator).toHaveClass("-mx-1", "my-1", "h-px", "bg-border")
  })

  it("merges a consumer class and honours a controlled open prop", async () => {
    render(PopoverExample, { props: { open: true, contentClass: "min-w-[320px]" } })

    await waitFor(() => expect(content()).not.toBeNull())
    expect(content()).toHaveClass("min-w-[320px]")
    expect(content()).not.toHaveClass("min-w-[220px]")
  })
})
