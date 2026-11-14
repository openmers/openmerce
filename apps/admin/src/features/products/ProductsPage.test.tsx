import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ApiFail, me, mockApi } from "../../test/http"
import { renderApp } from "../../test/renderApp"
import { PRODUCTS_PAGE_SIZE } from "./ProductsPage"

afterEach(() => vi.unstubAllGlobals())

const product = (n: number) => ({
  publicId: `prod_${n}`,
  version: 1,
  createdAt: 0,
  updatedAt: 1_700_000_000_000,
  name: `Product ${n}`,
  slug: `product-${n}`,
})

function list(input: unknown) {
  const { cursor } = input as { cursor?: string }
  if (cursor === "c2") return { items: [product(99)], nextCursor: null }
  const items = Array.from({ length: PRODUCTS_PAGE_SIZE }, (_, i) => product(i + 1))
  return { items, nextCursor: "c2" }
}

describe("ProductsPage", () => {
  it("renders rows and requests the next page with the returned cursor", async () => {
    const api = mockApi({ "admin.me": me(["products:read"]), "admin.products.list": list })
    const user = userEvent.setup()
    renderApp("/products")

    expect(await screen.findByRole("cell", { name: "Product 1" })).toBeInTheDocument()
    expect(api.callsTo("admin.products.list")[0]?.input).toEqual({ limit: PRODUCTS_PAGE_SIZE })

    await user.click(screen.getByRole("button", { name: "Next" }))

    expect(await screen.findByRole("cell", { name: "Product 99" })).toBeInTheDocument()
    expect(api.callsTo("admin.products.list")[1]?.input).toEqual({
      cursor: "c2",
      limit: PRODUCTS_PAGE_SIZE,
    })
  })

  it("shows the mapped message when the API refuses", async () => {
    mockApi({
      "admin.me": me(["products:read"]),
      "admin.products.list": () => {
        throw new ApiFail("FORBIDDEN", 403)
      },
    })
    renderApp("/products")

    await waitFor(() =>
      expect(screen.getByText("You do not have permission for this action.")).toBeInTheDocument(),
    )
  })
})
