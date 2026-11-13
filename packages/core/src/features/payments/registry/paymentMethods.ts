import type { HandlerArgs, PaymentHandler } from "../port/paymentHandler"
import type { PaymentMethodRow } from "../queries/loadPaymentMethods"

export type PaymentMethod = {
  id: number
  code: string
  name: string
  position: number
  handler: PaymentHandler
  args: HandlerArgs
  channelIds: readonly number[]
}

export type PaymentRegistry = {
  /** Offered methods of a channel, by `position`; no query (06 §6). */
  forChannel(channelId: number): PaymentMethod[]
  /** Webhook route lookup; `undefined` = not installed/enabled (route answers 404). */
  byCode(code: string): PaymentMethod | undefined
}

/**
 * In-memory method registry (22.3). A method is offered only when enabled, linked to the channel
 * and its handler is installed. Eligibility checkers are not built yet, so a method with a
 * `checker_code` is not offered (same rule as shipping's unknown calculators).
 */
export function createPaymentRegistry(
  rows: readonly PaymentMethodRow[],
  handlers: Readonly<Record<string, PaymentHandler>>,
): PaymentRegistry {
  const methods: PaymentMethod[] = []
  for (const r of rows) {
    const handler = handlers[r.handlerCode]
    if (!r.enabled || !handler || r.checkerCode !== null) continue
    methods.push({
      id: r.id,
      code: r.code,
      name: r.name,
      position: r.position,
      handler,
      args: r.handlerArgs,
      channelIds: r.channelIds,
    })
  }
  methods.sort((a, b) => a.position - b.position || a.id - b.id)
  const byCode = new Map(methods.map((m) => [m.code, m]))
  return {
    forChannel: (channelId) => methods.filter((m) => m.channelIds.includes(channelId)),
    byCode: (code) => byCode.get(code),
  }
}
