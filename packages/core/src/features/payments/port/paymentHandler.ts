/**
 * Payment handler port (06-odeme §2). The webhook route never knows the provider: it hands the raw
 * request to `verifyWebhook` and acts on the `Normalized` result. Provider keys come from the
 * secrets vault through `args`; rows never hold secrets.
 */
export type HandlerArgs = Readonly<Record<string, unknown>>

export type HandlerCtx = { now: number }

/** What a webhook route passes on; `headers` matches the web `Headers` reader. */
export type WebhookRequest = {
  body: string
  headers: { get(name: string): string | null }
}

type EventBase = {
  /** Provider event id: the idempotency boundary for refund events. */
  eventId: string
}

/** One of four outcomes; amounts are integer minor units. */
export type Normalized =
  | (EventBase & {
      kind: "paid"
      reservationPublicId: string
      /** Provider payment reference (unique per method). */
      reference: string
      amount: number
      currency: string
      /** `false`: authorization only (capture later). */
      captured: boolean
    })
  | (EventBase & { kind: "release"; reservationPublicId: string; reference?: string })
  | (EventBase & { kind: "pending"; reservationPublicId: string; reference?: string })
  | (EventBase & {
      kind: "refundSync"
      reference: string
      /** Cumulative absolute refunded amount reported by the provider (never a delta). */
      refundedAmount: number
      currency: string
      providerRefundId?: string
    })

export type CheckoutTarget = { publicId: string; amount: number; currency: string }

export type CheckoutStart =
  | { redirectUrl: string }
  | { pending: true; instructions?: Readonly<Record<string, unknown>> }

export type PaymentRef = {
  publicId: string
  reference: string | null
  amount: number
  currency: string
}

export type HandlerResult = { ok: true; providerRefundId?: string } | { ok: false; reason: string }

/** Subscription capabilities, typed only (06 §8); no implementation in the core yet. */
export type BillingCapabilities =
  | { billing: "self"; createSetup: unknown; chargeSaved: unknown; fetchChargeByKey: unknown }
  | {
      billing: "provider"
      syncPlan: unknown
      createSubscriptionCheckout: unknown
      manageSubscription: unknown
      portalUrl: unknown
    }

export interface PaymentHandler {
  readonly code: string
  /** `manual`: bank transfer, cash on delivery; settled by an admin, not a webhook. */
  readonly kind: "hosted" | "manual"
  readonly merchantOfRecord?: boolean
  readonly subscriptions?: BillingCapabilities
  createCheckout(ctx: HandlerCtx, target: CheckoutTarget, args: HandlerArgs): Promise<CheckoutStart>
  /** Verifies the signature (constant time) and normalizes; `null` = not authentic. */
  verifyWebhook(
    ctx: HandlerCtx,
    request: WebhookRequest,
    args: HandlerArgs,
  ): Promise<Normalized | null>
  /** Re-reads the truth from the provider (webhooks are untrusted nudges). */
  fetchStatus?(ctx: HandlerCtx, reference: string, args: HandlerArgs): Promise<Normalized>
  capture?(
    ctx: HandlerCtx,
    payment: PaymentRef,
    amount: number,
    args: HandlerArgs,
  ): Promise<HandlerResult>
  /** May throw on timeout: the refund then stays `unknown` and is never retried blindly. */
  refund?(
    ctx: HandlerCtx,
    payment: PaymentRef,
    amount: number,
    args: HandlerArgs,
    opts: { idempotencyKey: string },
  ): Promise<HandlerResult>
}
