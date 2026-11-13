import { render } from "@testing-library/svelte"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import DateSegmentExample from "./fixtures/DateSegmentExample.svelte"

const segments = () => [...document.querySelectorAll<HTMLElement>("[data-segment]")]

describe("DateSegment", () => {
  it("renders one segment per editable date part", () => {
    render(DateSegmentExample)

    expect(segments().map((segment) => segment.dataset.segment)).toEqual(["month", "day", "year"])
  })

  it("applies the focus styling classes to editable segments", () => {
    render(DateSegmentExample)

    const day = segments()[1]
    expect(day).toHaveClass("outline-hidden", "transition-fg")
    expect(day).toHaveClass("focus-visible:bg-bg-interactive", "focus-visible:text-fg-on-color")
    expect(day).toHaveTextContent("12")
  })

  it("renders spacing literals as margin spans", () => {
    const { container } = render(DateSegmentExample)

    const literals = [...container.querySelectorAll<HTMLElement>("span.mx-1")]
    expect(literals).toHaveLength(2)
    expect(literals[0]).toHaveTextContent("/")
  })

  it("marks empty segments as placeholders", () => {
    render(DateSegmentExample, { props: { empty: true } })

    const day = segments()[1]
    expect(day.querySelector("span")).toHaveClass("uppercase", "text-muted-foreground")
  })

  it("keeps the segments editable with the keyboard", async () => {
    const user = userEvent.setup()
    render(DateSegmentExample)

    const day = segments()[1]
    day.focus()
    expect(day).toHaveFocus()
    expect(day).toHaveAttribute("contenteditable", "true")

    await user.keyboard("15")
    expect(day).toHaveTextContent("15")
  })
})
