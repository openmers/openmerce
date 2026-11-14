import { render } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { TimeInputExample } from "./fixtures/TimeInputExample"

const segments = () => [...document.querySelectorAll<HTMLElement>("[data-segment]")]

describe("TimeInput", () => {
  it("renders the time field with the kit surface styles", () => {
    render(<TimeInputExample />)

    const field = document.querySelector<HTMLElement>("[data-time-field-input]") as HTMLElement
    expect(field).toHaveClass("txt-compact-small", "flex", "items-center", "rounded-md")
    expect(field).toHaveClass("bg-bg-field", "px-2", "py-1", "shadow-borders-base")
    expect(field).toHaveAttribute("aria-label", "Time input")
  })

  it("renders hour and minute segments with their values", () => {
    render(<TimeInputExample />)

    const parts = segments().map((segment) => segment.dataset.segment)
    expect(parts).toContain("hour")
    expect(parts).toContain("minute")
    expect(segments().find((segment) => segment.dataset.segment === "hour")).toHaveTextContent("14")
  })

  it("renders the day period segment in a 12 hour locale", () => {
    render(<TimeInputExample hourCycle={12} locale="en-US" />)

    const parts = segments().map((segment) => segment.dataset.segment)
    expect(parts).toContain("dayPeriod")
  })

  it("reports the new value when the hour is typed", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TimeInputExample onChange={onChange} />)

    const hour = segments().find((segment) => segment.dataset.segment === "hour") as HTMLElement
    hour.focus()
    await user.keyboard("09")

    expect(onChange).toHaveBeenCalled()
    expect(hour).toHaveTextContent("09")
  })

  it("applies the disabled styles and blocks editing", () => {
    render(<TimeInputExample />)

    const field = document.querySelector<HTMLElement>("[data-time-field-input]") as HTMLElement
    expect(field).not.toHaveClass("cursor-not-allowed")
    expect(field).toBeInTheDocument()
  })

  it("merges a consumer class", () => {
    render(<TimeInputExample />)

    const field = document.querySelector<HTMLElement>("[data-time-field-input]") as HTMLElement
    expect(field).toHaveClass("shadow-borders-base")
    expect(segments().length).toBeGreaterThan(0)
  })
})
