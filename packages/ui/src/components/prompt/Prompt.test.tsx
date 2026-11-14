import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { PromptExample } from "./fixtures/PromptExample"
import { PromptHostExample } from "./fixtures/PromptHostExample"

const alert = () => screen.queryByRole("alertdialog", { hidden: true })
const result = () => screen.getByTestId("result").textContent

describe("Prompt", () => {
  it("renders a closed prompt with its trigger", () => {
    render(<PromptExample />)

    expect(screen.getByRole("button", { name: "Mağazayı sil" })).toBeInTheDocument()
    expect(alert()).toBeNull()
  })

  it("opens as an alert dialog with the kit content styles", async () => {
    const user = userEvent.setup()
    render(<PromptExample />)

    await user.click(screen.getByRole("button", { name: "Mağazayı sil" }))
    await waitFor(() => expect(alert()).not.toBeNull())

    expect(alert()).toHaveClass("bg-card", "shadow-elevation-flyout", "max-w-[400px]")
    expect(alert()).toHaveClass("rounded-lg", "border", "flex-col")
    // The kit `Heading` look is applied to the dialog title through classes.
    expect(screen.getByRole("heading", { name: "Mağazayı sil", hidden: true })).toHaveClass(
      "h2-core",
      "text-foreground",
    )
    expect(screen.getByText("Bu işlem geri alınamaz.")).toHaveClass(
      "txt-compact-medium",
      "text-muted-foreground",
    )
  })

  it("uses the danger or primary action variant from the root", async () => {
    const user = userEvent.setup()
    render(<PromptExample />)

    await user.click(screen.getByRole("button", { name: "Mağazayı sil" }))
    await waitFor(() => expect(alert()).not.toBeNull())
    expect(screen.getByRole("button", { name: "Sil" })).toHaveClass("bg-destructive")
    expect(screen.getByRole("button", { name: "Vazgeç" })).toHaveClass("bg-secondary")
  })

  it("resolves true when the host prompt is confirmed", async () => {
    const user = userEvent.setup()
    render(<PromptHostExample />)

    await user.click(screen.getByRole("button", { name: "Sor" }))
    await waitFor(() => expect(alert()).not.toBeNull())

    await user.click(screen.getByRole("button", { name: "Sil" }))
    await waitFor(() => expect(result()).toBe("onaylandı"))
  })

  it("resolves false when cancelled", async () => {
    const user = userEvent.setup()
    render(<PromptHostExample />)

    await user.click(screen.getByRole("button", { name: "Sor" }))
    await waitFor(() => expect(alert()).not.toBeNull())

    await user.click(screen.getByRole("button", { name: "Vazgeç" }))
    await waitFor(() => expect(result()).toBe("iptal"))
  })

  it("requires the verification text before confirming", async () => {
    const user = userEvent.setup()
    render(<PromptHostExample verificationText="acme" />)

    await user.click(screen.getByRole("button", { name: "Sor" }))
    await waitFor(() => expect(alert()).not.toBeNull())

    const confirm = screen.getByRole("button", { name: "Sil" })
    expect(confirm).toBeDisabled()
    expect(screen.getByText("acme")).toBeInTheDocument()

    await user.type(screen.getByLabelText(/acme/), "acm")
    expect(confirm).toBeDisabled()

    await user.type(screen.getByLabelText(/acme/), "e")
    expect(confirm).toBeEnabled()

    await user.click(confirm)
    await waitFor(() => expect(result()).toBe("onaylandı"))
  })

  it("resolves false on Escape", async () => {
    const user = userEvent.setup()
    render(<PromptHostExample />)

    await user.click(screen.getByRole("button", { name: "Sor" }))
    await waitFor(() => expect(alert()).not.toBeNull())

    await user.keyboard("{Escape}")
    await waitFor(() => expect(result()).toBe("iptal"))
  })
})
