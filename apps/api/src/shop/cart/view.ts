import type { LoadedCart } from "./current"

/** Public cart shape (`shopCartView`): public ids only, amounts in minor units. */
export function cartView(loaded: LoadedCart | null, channelId: number) {
  if (!loaded) return { cart: null }
  const { config, data, totals } = loaded
  const priced = new Map(totals.lines.map((l) => [l.lineId, l]))
  const methodPublicId = (id: number | null) =>
    id === null ? null : (config.shippingMethods.find((m) => m.id === id)?.publicId ?? null)
  return {
    cart: {
      id: data.cart.publicId,
      version: data.cart.version,
      currency: data.cart.currency,
      email: data.cart.email,
      couponCodes: data.cart.couponCodes,
      shippingAddress: data.cart.shippingAddress,
      shippingMethod: methodPublicId(totals.shipping.methodId),
      lines: data.lines.map((l) => {
        const p = priced.get(l.id)
        return {
          variant: l.variantPublicId,
          lineKey: l.lineKey,
          quantity: l.quantity,
          available: p !== undefined,
          unitPrice: p?.unitPrice ?? 0,
          amount: p?.amount ?? 0,
          discount: p?.discount ?? 0,
          tax: p?.tax ?? 0,
          gross: p?.gross ?? 0,
        }
      }),
      shippingOptions: totals.shipping.options.map((o) => ({
        id: o.publicId,
        name: o.name,
        amount: o.amount,
      })),
      paymentMethods: config.payments
        .forChannel(channelId)
        .map((m) => ({ code: m.code, name: m.name })),
      totals: {
        subtotal: totals.subtotal,
        discount: totals.discount,
        shipping: totals.shipping.gross,
        tax: totals.tax,
        net: totals.net,
        gross: totals.gross,
      },
    },
  }
}
