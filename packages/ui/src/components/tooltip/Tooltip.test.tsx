import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { TooltipCustomTrigger } from "./fixtures/TooltipCustomTrigger"
import { Tooltip } from "./Tooltip"

// The visible content element; Radix renders `role="tooltip"` on a visually hidden copy.
const tooltipContent = () => document.querySelector<HTMLElement>("[data-tooltip-content]")

describe("Tooltip", () => {
  it("renders a button trigger without the content", () => {
    render(<Tooltip content="Kaydet">Kaydet</Tooltip>)

    expect(screen.getByRole("button", { name: "Kaydet" })).toBeInTheDocument()
    expect(tooltipContent()).toBeNull()
  })

  it("opens the tooltip on hover with the kit styles", async () => {
    const user = userEvent.setup()
    render(<Tooltip content="Kaydet">Kaydet</Tooltip>)

    await user.hover(screen.getByRole("button", { name: "Kaydet" }))

    await waitFor(() => expect(tooltipContent()).not.toBeNull())
    const content = tooltipContent() as HTMLElement
    expect(content).toHaveTextContent("Kaydet")
    expect(content).toHaveClass("bg-card", "text-muted-foreground", "rounded-lg")
    expect(content).toHaveClass("shadow-elevation-tooltip", "txt-compact-xsmall")
    expect(content).toHaveStyle("--tooltip-max-width: 220px")
  })

  it("opens on focus and closes on Escape", async () => {
    const user = userEvent.setup()
    render(<Tooltip content="İpucu">İpucu</Tooltip>)

    await user.tab()
    await waitFor(() => expect(tooltipContent()).not.toBeNull())

    await user.keyboard("{Escape}")
    await waitFor(() => expect(tooltipContent()).toBeNull())
  })

  it("honours a controlled open state and reports changes", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <Tooltip content="İpucu" open onOpenChange={onOpenChange}>
        İpucu
      </Tooltip>,
    )

    await waitFor(() => expect(tooltipContent()).not.toBeNull())
    await user.hover(screen.getByRole("button", { name: "İpucu" }))
    expect(onOpenChange).not.toHaveBeenCalledWith(true)
  })

  it("does not open when disabled", async () => {
    const user = userEvent.setup()
    render(
      <Tooltip content="İpucu" disabled>
        İpucu
      </Tooltip>,
    )

    await user.hover(screen.getByRole("button", { name: "İpucu" }))
    expect(tooltipContent()).toBeNull()
  })

  it("renders a custom trigger element through asChild", async () => {
    const user = userEvent.setup()
    render(<TooltipCustomTrigger content="İpucu" />)

    const link = screen.getByRole("link", { name: "Bağlantı" })
    expect(link).toHaveAttribute("data-state", "closed")

    await user.hover(link)
    await waitFor(() => expect(tooltipContent()).not.toBeNull())
  })

  it("merges a consumer class with the content classes and forwards the side", async () => {
    const user = userEvent.setup()
    render(
      <Tooltip content="İpucu" className="rounded-full px-4" side="top" maxWidth={300}>
        İpucu
      </Tooltip>,
    )

    await user.hover(screen.getByRole("button", { name: "İpucu" }))
    await waitFor(() => expect(tooltipContent()).not.toBeNull())
    const content = tooltipContent() as HTMLElement
    expect(content).toHaveClass("rounded-full", "px-4")
    expect(content).not.toHaveClass("rounded-lg")
    expect(content).toHaveAttribute("data-side", "top")
    expect(content).toHaveStyle("--tooltip-max-width: 300px")
  })
})
