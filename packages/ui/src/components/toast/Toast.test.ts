import { render, screen, waitFor } from "@testing-library/svelte"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import ToasterExample from "./fixtures/ToasterExample.svelte"
import Toast from "./Toast.svelte"

// jsdom does not provide `window.matchMedia`; svelte-sonner reads the theme preference through it.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
}

describe("Toast", () => {
  it("renders the title with the kit card styles", () => {
    render(Toast, { props: { id: "t1", title: "Kaydedildi" } })

    const toast = screen.getByRole("status")
    expect(toast).toHaveClass("rounded-lg", "bg-popover", "p-3", "shadow-elevation-flyout")
    expect(toast).toHaveClass("min-w-[360px]", "max-w-[440px]")
    expect(screen.getByText("Kaydedildi")).toHaveClass("txt-compact-small-plus", "text-foreground")
  })

  it.each([
    ["success", "text-tag-green-icon"],
    ["warning", "text-tag-orange-icon"],
    ["error", "text-tag-red-icon"],
    ["info", "text-foreground"],
    ["loading", "text-tag-blue-icon"],
  ])("renders the %s icon with its colour", (variant, iconClass) => {
    render(Toast, { props: { id: "t1", title: "Bildirim", variant } })

    const icon = screen.getByRole("status").querySelector("svg")
    expect(icon).toHaveClass(iconClass)
  })

  it("renders the description and switches to the two column layout", () => {
    render(Toast, { props: { id: "t1", title: "Kaydedildi", description: "Ürün güncellendi" } })

    expect(screen.getByText("Ürün güncellendi")).toHaveClass("txt-small", "text-muted-foreground")
    expect(screen.getByRole("status").firstElementChild).toHaveClass(
      "grid-cols-[20px_1fr]",
      "items-start",
    )
  })

  it("renders an action button and calls it", async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(Toast, {
      props: { id: "t1", title: "Hata", action: { label: "Tekrar dene", onClick } },
    })

    const action = screen.getByRole("button", { name: "Tekrar dene" })
    expect(action).toHaveClass("txt-compact-small-plus", "rounded-[4px]", "bg-card")

    await user.click(action)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it("marks a destructive action", () => {
    render(Toast, {
      props: {
        id: "t1",
        title: "Hata",
        action: { label: "Sil", onClick: () => {}, variant: "destructive" },
      },
    })

    expect(screen.getByRole("button", { name: "Sil" })).toHaveClass("text-fg-error")
  })

  it("hides the dismiss button when not dismissable", () => {
    render(Toast, { props: { id: "t1", title: "Bildirim", dismissable: false } })

    expect(screen.queryByRole("button", { name: "Bildirimi kapat" })).not.toBeInTheDocument()
  })

  it("shows a dismiss button by default", () => {
    render(Toast, { props: { id: "t1", title: "Bildirim" } })

    expect(screen.getByRole("button", { name: "Bildirimi kapat" })).toHaveClass("h-5", "w-5")
  })
})

describe("Toaster", () => {
  it("renders a toast through the sonner integration", async () => {
    const user = userEvent.setup()
    render(ToasterExample)

    await user.click(screen.getByRole("button", { name: "Başarı bildirimi" }))

    await waitFor(() => expect(screen.getByText("Kaydedildi")).toBeInTheDocument())
    expect(screen.getByText("Ürün güncellendi")).toHaveClass("txt-small")
    expect(screen.getByText("Kaydedildi").closest("[data-variant]")).toHaveAttribute(
      "data-variant",
      "success",
    )
  })

  it("renders an error toast with its action", async () => {
    const user = userEvent.setup()
    render(ToasterExample)

    await user.click(screen.getByRole("button", { name: "Hata bildirimi" }))

    await waitFor(() => expect(screen.getByText("Hata")).toBeInTheDocument())
    expect(screen.getByText("Hata").closest("[data-variant]")).toHaveAttribute(
      "data-variant",
      "error",
    )
    expect(screen.getByRole("button", { name: "Tekrar dene" })).toBeInTheDocument()
  })
})
