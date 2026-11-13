import { render, screen } from "@testing-library/svelte"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import ProgressAccordionExample from "./fixtures/ProgressAccordionExample.svelte"

const triggers = () => screen.getAllByRole("button")

describe("ProgressAccordion", () => {
  it("renders items with the divider styles", () => {
    render(ProgressAccordionExample)

    const items = document.querySelectorAll("[data-accordion-item]")
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveClass("border-border", "border-b", "last-of-type:border-b-0")
  })

  it("renders the open item and its content", () => {
    render(ProgressAccordionExample)

    expect(screen.getByText("Adres")).toHaveClass("h3-core", "text-foreground", "gap-4", "px-6")
    expect(screen.getByText("Adres bilgileri")).toBeInTheDocument()
    expect(screen.getByText("Adres").closest("[data-accordion-item]")).toHaveAttribute(
      "data-state",
      "open",
    )
  })

  it("renders a status indicator per header", () => {
    render(ProgressAccordionExample)

    const indicators = document.querySelectorAll("[data-status]")
    expect(indicators[0]).toHaveAttribute("data-status", "completed")
    expect(indicators[0]).toHaveClass("h-12", "w-12", "text-fg-muted")
    expect(indicators[1]).toHaveAttribute("data-status", "in-progress")
  })

  it("opens another item and reports the value", async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(ProgressAccordionExample, { props: { onValueChange } })

    await user.click(triggers()[1])

    expect(onValueChange).toHaveBeenCalledWith("odeme")
    expect(screen.getByText("Ödeme bilgileri")).toBeInTheDocument()
    expect(screen.getByText("Adres").closest("[data-accordion-item]")).toHaveAttribute(
      "data-state",
      "closed",
    )
  })

  it("closes the open item with a second click", async () => {
    const user = userEvent.setup()
    render(ProgressAccordionExample)

    await user.click(triggers()[0])
    expect(screen.getByText("Adres").closest("[data-accordion-item]")).toHaveAttribute(
      "data-state",
      "closed",
    )
  })

  it("exposes the trigger as an icon button with the rotating plus icon", () => {
    render(ProgressAccordionExample)

    const trigger = triggers()[0]
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    expect(trigger.querySelector("svg")).toHaveClass(
      "group-data-[state=open]:rotate-45",
      "transition-transform",
    )
  })

  it("applies the content animation classes", () => {
    render(ProgressAccordionExample)

    const content = document.querySelector("[data-accordion-content]")
    expect(content).toHaveClass(
      "overflow-hidden",
      "pl-[88px]",
      "pr-6",
      "data-[state=open]:animate-accordion-down",
    )
  })
})
