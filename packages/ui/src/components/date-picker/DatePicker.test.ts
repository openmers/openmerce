import { render, screen, waitFor } from "@testing-library/svelte"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import DatePickerExample from "./fixtures/DatePickerExample.svelte"

const group = () =>
  document.querySelector<HTMLElement>("[data-segment]")?.closest(".grid") as HTMLElement
const content = () => document.querySelector<HTMLElement>("[data-popover-content]")

describe("DatePicker", () => {
  it("renders the field group with the Medusa styles", () => {
    render(DatePickerExample)

    expect(group()).toHaveClass("bg-bg-field", "shadow-borders-base", "rounded-md", "gap-2")
    expect(group()).toHaveClass("grid-cols-[32px_1fr_32px]")
    expect(screen.getByRole("button", { name: "Open calendar" })).toHaveClass(
      "size-8",
      "border-r",
      "text-muted-foreground",
    )
  })

  it("renders the selected date in the field segments", () => {
    render(DatePickerExample)

    const day = document.querySelector<HTMLElement>('[data-segment="day"]')
    expect(day).toHaveTextContent("12")
    expect(document.querySelector<HTMLElement>('[data-segment="year"]')).toHaveTextContent("2026")
  })

  it("uses the small size columns", () => {
    render(DatePickerExample, { props: { size: "small" } })

    expect(group()).toHaveClass("grid-cols-[28px_1fr_28px]")
    expect(screen.getByRole("button", { name: "Open calendar" })).toHaveClass("size-7")
  })

  it("opens the calendar popover and applies the Medusa panel styles", async () => {
    const user = userEvent.setup()
    render(DatePickerExample)

    await user.click(screen.getByRole("button", { name: "Open calendar" }))

    await waitFor(() => expect(content()).not.toBeNull())
    expect(content()).toHaveClass("flex", "flex-col", "p-0")
    expect(document.querySelector("[data-calendar-grid]")).toBeInTheDocument()
    expect(document.querySelector('[aria-label="Önceki ay"]')).toBeInTheDocument()
  })

  it("selects a day from the calendar and closes the popover", async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(DatePickerExample, { props: { onValueChange } })

    await user.click(screen.getByRole("button", { name: "Open calendar" }))
    await waitFor(() => expect(content()).not.toBeNull())

    const days = [...document.querySelectorAll<HTMLElement>("[data-calendar-day]")]
    const target = days.find(
      (day) => !day.hasAttribute("data-outside-month") && day.textContent?.trim() === "20",
    )
    await user.click(target as HTMLElement)

    expect(onValueChange).toHaveBeenCalled()
    await waitFor(() => expect(content()).toBeNull())
    expect(document.querySelector<HTMLElement>('[data-segment="day"]')).toHaveTextContent("20")
  })

  it("clears the value with the clear button", async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(DatePickerExample, { props: { onValueChange } })

    await user.click(screen.getByRole("button", { name: "Clear date" }))

    expect(onValueChange).toHaveBeenCalledWith(undefined)
    expect(screen.queryByRole("button", { name: "Clear date" })).not.toBeInTheDocument()
    expect(document.querySelector<HTMLElement>('[data-segment="day"]')).toHaveTextContent("gg")
    expect(group()).toHaveClass("pr-2")
  })

  it("moves the visible month inside the popover", async () => {
    const user = userEvent.setup()
    render(DatePickerExample)

    await user.click(screen.getByRole("button", { name: "Open calendar" }))
    await waitFor(() => expect(content()).not.toBeNull())

    await user.click(document.querySelector('[aria-label="Sonraki ay"]') as HTMLElement)
    expect(document.querySelector("[data-calendar-heading]")).toHaveTextContent("Aralık 2026")
  })
})
