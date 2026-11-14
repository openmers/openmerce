import { screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { me, mockApi } from "../../test/http"
import { renderApp } from "../../test/renderApp"

afterEach(() => vi.unstubAllGlobals())

const order = {
  id: "ord_1",
  number: "1001",
  state: "placed",
  paymentStatus: "captured",
  fulfillmentStatus: "unfulfilled",
  currency: "USD",
  totalGross: 12_550,
  hasPersonalization: false,
  placedAt: 1_700_000_000_000,
  subtotalNet: 10_000,
  taxTotal: 2_050,
  discountTotal: 500,
  shippingTotal: 1_000,
  stockException: false,
  lines: [
    {
      id: "line_1",
      name: "Sneaker",
      sku: "SNK-1",
      quantity: 2,
      unitPriceNet: 5_000,
      unitPriceGross: 6_025,
      personalization: null,
    },
  ],
  payments: [],
}

describe("OrderDetail", () => {
  it("renders lines and totals for the requested order", async () => {
    const api = mockApi({ "admin.me": me(["orders:read"]), "admin.orders.get": () => ({ order }) })
    renderApp("/orders/ord_1")

    expect(await screen.findByRole("heading", { name: "Order 1001" })).toBeInTheDocument()
    expect(screen.getByRole("cell", { name: "Sneaker" })).toBeInTheDocument()
    expect(screen.getByText("$100.00")).toBeInTheDocument()
    expect(screen.getByText("-$5.00")).toBeInTheDocument()
    expect(screen.getByText("$10.00")).toBeInTheDocument()
    expect(screen.getByText("$20.50")).toBeInTheDocument()
    expect(screen.getByText("$125.50")).toBeInTheDocument()
    expect(api.callsTo("admin.orders.get")[0]?.input).toEqual({ id: "ord_1" })
  })
})
