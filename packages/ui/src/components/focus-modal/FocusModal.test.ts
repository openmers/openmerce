import { render, screen, waitFor } from "@testing-library/svelte"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import FocusModalExample from "./fixtures/FocusModalExample.svelte"

const dialog = () => screen.queryByRole("dialog", { hidden: true })

async function openModal(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Yeni ürün" }))
  await waitFor(() => expect(dialog()).not.toBeNull())
  return dialog() as HTMLElement
}

describe("FocusModal", () => {
  it("renders a closed modal with its trigger", () => {
    render(FocusModalExample)

    expect(screen.getByRole("button", { name: "Yeni ürün" })).toBeInTheDocument()
    expect(dialog()).toBeNull()
  })

  it("opens as a full screen panel with the kit content styles", async () => {
    const user = userEvent.setup()
    render(FocusModalExample)

    const content = await openModal(user)
    expect(content).toHaveClass("fixed", "inset-2", "flex-col", "overflow-hidden", "rounded-lg")
    expect(content).toHaveClass("bg-card", "shadow-elevation-modal", "border")
    expect(screen.getByText("Yeni ürün oluştur")).toBeInTheDocument()
  })

  it("renders the header with a close button and the esc hint", async () => {
    const user = userEvent.setup()
    render(FocusModalExample)

    await openModal(user)

    expect(screen.getByRole("button", { name: "Kapat" })).toBeInTheDocument()
    expect(screen.getByText("esc")).toHaveClass("txt-compact-xsmall-plus", "min-w-[20px]")
    expect(screen.getByText("Zorunlu alanları doldurun.")).toHaveClass("txt-small")
  })

  it("closes with the header close button and with Escape", async () => {
    const user = userEvent.setup()
    render(FocusModalExample)

    await openModal(user)
    await user.click(screen.getByRole("button", { name: "Kapat" }))
    await waitFor(() => expect(dialog()).toBeNull())

    await openModal(user)
    await user.keyboard("{Escape}")
    await waitFor(() => expect(dialog()).toBeNull())
  })

  it("closes through the footer close part", async () => {
    const user = userEvent.setup()
    render(FocusModalExample)

    await openModal(user)
    await user.click(screen.getByText("İptal"))
    await waitFor(() => expect(dialog()).toBeNull())
  })

  it("lays out body and footer and merges a consumer class", async () => {
    const user = userEvent.setup()
    render(FocusModalExample, { props: { contentClass: "inset-4" } })

    const content = await openModal(user)
    expect(content).toHaveClass("inset-4")
    expect(content).not.toHaveClass("inset-2")
    expect(screen.getByText("Form alanları").parentElement).toHaveClass("flex-1")
    expect(screen.getByText("İptal").parentElement).toHaveClass(
      "justify-end",
      "border-t",
      "p-4",
      "gap-x-2",
    )
  })
})
