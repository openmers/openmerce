import { screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { me, mockApi } from "../../test/http"
import { renderApp } from "../../test/renderApp"

afterEach(() => vi.unstubAllGlobals())

describe("Sidebar", () => {
  it("hides nav items the permission set lacks", async () => {
    mockApi({ "admin.me": me(["orders:read"]) })
    renderApp("/")

    const nav = await screen.findByRole("navigation", { name: "Main" })
    expect(within(nav).getByRole("link", { name: "Home" })).toBeInTheDocument()
    expect(within(nav).getByRole("link", { name: "Orders" })).toBeInTheDocument()
    expect(within(nav).queryByRole("link", { name: "Products" })).not.toBeInTheDocument()
  })
})
