import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { DrawerExample } from "./fixtures/DrawerExample"

const dialog = () => screen.queryByRole("dialog", { hidden: true })

async function openDrawer(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Detayları aç" }))
  await waitFor(() => expect(dialog()).not.toBeNull())
  return dialog() as HTMLElement
}

describe("Drawer", () => {
  it("renders a closed drawer with its trigger", () => {
    render(<DrawerExample />)

    expect(screen.getByRole("button", { name: "Detayları aç" })).toBeInTheDocument()
    expect(dialog()).toBeNull()
  })

  it("opens as a right side panel with the kit content styles", async () => {
    const user = userEvent.setup()
    render(<DrawerExample />)

    const content = await openDrawer(user)
    expect(content).toHaveClass("fixed", "inset-y-2", "flex-col", "rounded-lg", "border")
    expect(content).toHaveClass("sm:right-2", "sm:max-w-[560px]", "bg-card")
    expect(screen.getByText("Sipariş detayı")).toBeInTheDocument()
  })

  it("renders the header with the esc hint and a labelled close button", async () => {
    const user = userEvent.setup()
    render(<DrawerExample />)

    await openDrawer(user)

    expect(screen.getByText("esc")).toHaveClass("txt-compact-xsmall-plus", "h-5", "border")
    expect(screen.getByRole("button", { name: "Kapat" })).toBeInTheDocument()
    expect(screen.getByText("#1042 numaralı sipariş")).toHaveClass("txt-small")
  })

  it("closes with the header close button", async () => {
    const user = userEvent.setup()
    render(<DrawerExample />)

    await openDrawer(user)
    await user.click(screen.getByRole("button", { name: "Kapat" }))

    await waitFor(() => expect(dialog()).toBeNull())
  })

  it("closes with the footer close part and with Escape", async () => {
    const user = userEvent.setup()
    render(<DrawerExample />)

    await openDrawer(user)
    await user.click(screen.getByText("Vazgeç"))
    await waitFor(() => expect(dialog()).toBeNull())

    await openDrawer(user)
    await user.keyboard("{Escape}")
    await waitFor(() => expect(dialog()).toBeNull())
  })

  it("renders body and footer with their layout classes and merges a consumer class", async () => {
    const user = userEvent.setup()
    render(<DrawerExample />)

    await openDrawer(user)
    const body = screen.getByText("Ürünler burada listelenir.").parentElement
    expect(body).toHaveClass("flex-1", "px-6", "py-4")
    expect(body).not.toHaveClass("p-2")
    expect(screen.getByText("Vazgeç").parentElement).toHaveClass(
      "justify-end",
      "gap-x-2",
      "overflow-y-auto",
      "border-t",
    )
  })
})
