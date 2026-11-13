import { render, screen } from "@testing-library/svelte"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import OtpInput from "./OtpInput.svelte"

// jsdom `ResizeObserver` sağlamaz; bits-ui PinInput kök yüksekliğini bununla izler.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}

// bits-ui PinInput değer değişiminde 0, 10 ve 50 ms'lik üç `setTimeout` kurar (syncTimeouts) ve
// gizli input'a `input` olayı yollar; jsdom kapanmadan en uzunu (50 ms) bitsin diye 80 ms beklenir.
afterEach(async () => {
  await new Promise((resolve) => setTimeout(resolve, 80))
})

const cells = () => document.querySelectorAll<HTMLElement>("[data-pin-input-cell]")

describe("OtpInput", () => {
  it("renders six cells in two groups with a separator", () => {
    render(OtpInput)

    expect(cells()).toHaveLength(6)
    expect(screen.getByText("-")).toHaveClass("txt-compact-small-plus", "text-muted-foreground")
    expect(screen.getByLabelText("One-time password")).toBeInTheDocument()
  })

  it("applies the Medusa cell styles", () => {
    render(OtpInput)

    const cell = cells()[0]
    expect(cell).toHaveClass("txt-compact-large", "font-mono", "size-10", "bg-bg-field")
    expect(cell).toHaveClass("first:rounded-l-md", "last:rounded-r-md", "shadow-borders-base")
  })

  it("types digits into the cells and reports the value", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(OtpInput, { props: { onChange } })

    await user.click(screen.getByLabelText("One-time password"))
    await user.keyboard("123")

    expect(onChange).toHaveBeenLastCalledWith("123")
    expect(cells()[0]).toHaveTextContent("1")
    expect(cells()[2]).toHaveTextContent("3")
  })

  it("calls onComplete when the code is full", async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(OtpInput, { props: { onComplete } })

    await user.click(screen.getByLabelText("One-time password"))
    await user.keyboard("123456")

    expect(onComplete).toHaveBeenCalledWith("123456")
  })

  it("supports a custom length and group size", () => {
    render(OtpInput, { props: { length: 4, groupSize: 2 } })

    expect(cells()).toHaveLength(4)
    expect(screen.getAllByText("-")).toHaveLength(1)
  })

  it("marks the focused cell as active", async () => {
    const user = userEvent.setup()
    render(OtpInput)

    await user.click(screen.getByLabelText("One-time password"))
    expect(cells()[0]).toHaveAttribute("data-active")
    expect(cells()[0]).toHaveClass("data-[active]:shadow-borders-interactive-with-active")
  })

  it("does not accept input when disabled", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(OtpInput, { props: { disabled: true, onChange } })

    await user.click(screen.getByLabelText("One-time password"))
    await user.keyboard("1")

    expect(onChange).not.toHaveBeenCalled()
    expect(cells()[0]).toHaveClass("data-[disabled]:!bg-muted")
  })

  it("merges a consumer class on the root", () => {
    render(OtpInput, { props: { class: "gap-x-6", "aria-label": "Kod" } })

    const root = document.querySelector("[data-pin-input-root]") as HTMLElement
    expect(root).toHaveClass("gap-x-6")
    expect(root).not.toHaveClass("gap-x-3")
    // `aria-label` gizli input'a gider (Radix'teki grup etiketinin karşılığı).
    expect(screen.getByLabelText("Kod")).toBeInTheDocument()
  })
})
