import { render, screen, waitFor } from "@testing-library/svelte"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { textSnippet } from "../../test/snippet"
import TooltipCustomTrigger from "./fixtures/TooltipCustomTrigger.svelte"
import Tooltip from "./Tooltip.svelte"

// bits-ui içerik öğesine `role="tooltip"` eklemez; veri özniteliği üzerinden sorgularız.
const tooltipContent = () => document.querySelector<HTMLElement>("[data-tooltip-content]")

describe("Tooltip", () => {
  it("renders a button trigger without the content", () => {
    render(Tooltip, {
      props: { content: textSnippet("Kaydet"), children: textSnippet("Kaydet") },
    })

    expect(screen.getByRole("button", { name: "Kaydet" })).toBeInTheDocument()
    expect(tooltipContent()).toBeNull()
  })

  it("opens the tooltip on hover with the Medusa styles", async () => {
    const user = userEvent.setup()
    render(Tooltip, {
      props: { content: textSnippet("Kaydet"), children: textSnippet("Kaydet") },
    })

    await user.hover(screen.getByRole("button", { name: "Kaydet" }))

    await waitFor(() => expect(tooltipContent()).not.toBeNull())
    const content = tooltipContent() as HTMLElement
    expect(content).toHaveTextContent("Kaydet")
    expect(content).toHaveClass("bg-card", "text-muted-foreground", "rounded-lg")
    expect(content).toHaveClass("shadow-elevation-tooltip", "txt-compact-xsmall")
    expect(content).toHaveStyle("max-width: 220px")
  })

  it("opens on focus and closes on Escape", async () => {
    const user = userEvent.setup()
    render(Tooltip, {
      props: { content: textSnippet("İpucu"), children: textSnippet("İpucu") },
    })

    await user.tab()
    await waitFor(() => expect(tooltipContent()).not.toBeNull())

    await user.keyboard("{Escape}")
    await waitFor(() => expect(tooltipContent()).toBeNull())
  })

  it("honours a controlled open state and reports changes", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(Tooltip, {
      props: {
        content: textSnippet("İpucu"),
        children: textSnippet("İpucu"),
        open: true,
        onOpenChange,
      },
    })

    await waitFor(() => expect(tooltipContent()).not.toBeNull())
    await user.hover(screen.getByRole("button", { name: "İpucu" }))
    expect(onOpenChange).not.toHaveBeenCalledWith(true)
  })

  it("does not open when disabled", async () => {
    const user = userEvent.setup()
    render(Tooltip, {
      props: { content: textSnippet("İpucu"), children: textSnippet("İpucu"), disabled: true },
    })

    await user.hover(screen.getByRole("button", { name: "İpucu" }))
    expect(tooltipContent()).toBeNull()
  })

  it("renders a custom trigger element through the child snippet", async () => {
    const user = userEvent.setup()
    render(TooltipCustomTrigger, { props: { content: textSnippet("İpucu") } })

    const link = screen.getByRole("link", { name: "Bağlantı" })
    expect(link).toHaveAttribute("data-tooltip-trigger")

    await user.hover(link)
    await waitFor(() => expect(tooltipContent()).not.toBeNull())
  })

  it("merges a consumer class with the content classes and forwards the side", async () => {
    const user = userEvent.setup()
    render(Tooltip, {
      props: {
        content: textSnippet("İpucu"),
        children: textSnippet("İpucu"),
        class: "rounded-full px-4",
        side: "top",
        maxWidth: 300,
      },
    })

    await user.hover(screen.getByRole("button", { name: "İpucu" }))
    await waitFor(() => expect(tooltipContent()).not.toBeNull())
    const content = tooltipContent() as HTMLElement
    expect(content).toHaveClass("rounded-full", "px-4")
    expect(content).not.toHaveClass("rounded-lg")
    expect(content).toHaveAttribute("data-side", "top")
    expect(content).toHaveStyle("max-width: 300px")
  })
})
