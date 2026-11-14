import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { CalendarExample } from "./fixtures/CalendarExample"

const days = () => [...document.querySelectorAll<HTMLElement>("[data-calendar-day]")]
const currentMonthDays = () => days().filter((day) => !day.hasAttribute("data-outside-month"))
const selectedDay = () => document.querySelector<HTMLElement>("[data-calendar-day][data-selected]")
const heading = () => document.querySelector<HTMLElement>("[data-calendar-heading]")

describe("Calendar", () => {
  it("renders a grid with weekday headers and the month heading", () => {
    render(<CalendarExample />)

    expect(screen.getByRole("grid")).toBeInTheDocument()
    expect(screen.getAllByRole("columnheader")).toHaveLength(7)
    expect(heading()).toHaveTextContent("Kasım 2026")
    expect(heading()).toHaveClass("txt-compact-small-plus", "text-center")
  })

  it("styles the header bar and the navigation buttons", () => {
    render(<CalendarExample />)

    expect(screen.getByRole("button", { name: "Önceki ay" })).toHaveClass(
      "rounded-[4px]",
      "h-7",
      "w-7",
    )
    expect(screen.getByRole("button", { name: "Sonraki ay" })).toBeInTheDocument()

    const header = screen.getByRole("button", { name: "Önceki ay" }).parentElement as HTMLElement
    expect(header).toHaveClass("bg-bg-field", "rounded-md", "border", "p-0.5")
    expect(header).toHaveClass("grid-cols-[28px_1fr_28px]")
  })

  it("styles the day cells and marks the selected day", () => {
    render(<CalendarExample />)

    expect(screen.getAllByRole("gridcell")[0]).toHaveClass("p-1")

    expect(selectedDay()).toHaveClass("size-8", "rounded-md", "txt-compact-small")
    expect(selectedDay()).toHaveClass("data-[selected]:!bg-bg-interactive")
    expect(selectedDay()).toHaveTextContent("12")
    expect(screen.getAllByRole("columnheader")[0]).toHaveClass(
      "txt-compact-small-plus",
      "text-muted-foreground",
      "size-8",
    )
  })

  it("moves the visible month with the next button", async () => {
    const user = userEvent.setup()
    render(<CalendarExample />)

    await user.click(screen.getByRole("button", { name: "Sonraki ay" }))
    expect(heading()).toHaveTextContent("Aralık 2026")
  })

  it("selects another day and reports it", async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<CalendarExample onValueChange={onValueChange} />)

    const day = currentMonthDays().find((element) => element.textContent?.trim() === "5")
    await user.click(day as HTMLElement)

    expect(onValueChange).toHaveBeenCalled()
    expect(selectedDay()).toHaveTextContent("5")
  })

  it("supports keyboard navigation between days", async () => {
    const user = userEvent.setup()
    render(<CalendarExample />)

    ;(selectedDay() as HTMLElement).focus()
    await user.keyboard("{ArrowRight}")

    expect(document.activeElement).toHaveTextContent("13")
    await user.keyboard("{Enter}")
    expect(selectedDay()).toHaveTextContent("13")
  })
})
