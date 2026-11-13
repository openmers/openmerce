// Test payment handler (22.10): structurally a core `PaymentHandler` (test-utils does not import
// core). Webhooks are HMAC-SHA-256 signed over the raw body; verification uses Web Crypto
// `verify`, which compares in constant time. The fake "provider" keeps its own truth so
// `fetchStatus` can disagree with a forged or stale nudge.

type Event = { kind: string; eventId: string; reference?: string; [k: string]: unknown }
type Headers = { get(name: string): string | null }

export const FAKE_SIGNATURE_HEADER = "x-fake-signature"

const encoder = new TextEncoder()

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> | null {
  if (!/^(?:[0-9a-f]{2})+$/.test(hex)) return null
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

async function hmacKey(secret: string, usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  )
}

export type FakeRefundMode = "ok" | "decline" | "timeout"

export function fakePaymentHandler(opts: { code?: string } = {}) {
  /** Provider-side truth per payment reference, returned by `fetchStatus`. */
  const truth = new Map<string, Event>()
  const refundCalls: { reference: string | null; amount: number; idempotencyKey: string }[] = []
  let refundMode: FakeRefundMode = "ok"
  const secretOf = (args: Readonly<Record<string, unknown>>) => {
    if (typeof args.secret !== "string" || args.secret === "") throw new Error("secret missing")
    return args.secret
  }

  const handler = {
    code: opts.code ?? "fake",
    kind: "hosted" as const,
    async createCheckout(_ctx: unknown, target: { publicId: string }) {
      return { redirectUrl: `https://pay.example.test/checkout/${target.publicId}` }
    },
    async verifyWebhook(
      _ctx: unknown,
      request: { body: string; headers: Headers },
      args: Readonly<Record<string, unknown>>,
    ) {
      const sig = hexToBytes(request.headers.get(FAKE_SIGNATURE_HEADER) ?? "")
      if (!sig) return null
      const key = await hmacKey(secretOf(args), "verify")
      const ok = await crypto.subtle.verify("HMAC", key, sig, encoder.encode(request.body))
      if (!ok) return null
      // `never`: assignable to the core's `Normalized` without importing core
      return JSON.parse(request.body) as never
    },
    async fetchStatus(_ctx: unknown, reference: string) {
      const event = truth.get(reference)
      if (!event) throw new Error(`unknown reference ${reference}`)
      return event as never
    },
    async refund(
      _ctx: unknown,
      payment: { reference: string | null },
      amount: number,
      _args: unknown,
      o: { idempotencyKey: string },
    ) {
      refundCalls.push({ reference: payment.reference, amount, idempotencyKey: o.idempotencyKey })
      if (refundMode === "timeout") throw new Error("provider timeout")
      if (refundMode === "decline") return { ok: false as const, reason: "declined" }
      return { ok: true as const, providerRefundId: `re_${refundCalls.length}` }
    },
  }

  return {
    handler,
    refundCalls,
    setRefundMode(mode: FakeRefundMode) {
      refundMode = mode
    },
    /** What the provider would answer for `reference` (defaults to the event itself). */
    setTruth(reference: string, event: Event) {
      truth.set(reference, event)
    },
    /** A signed webhook request; `truth` is updated unless `forge` is set. */
    async request(
      event: Event,
      secret: string,
      o: { forge?: boolean; badSignature?: boolean } = {},
    ) {
      const body = JSON.stringify(event)
      if (event.reference && !o.forge) truth.set(event.reference, event)
      const key = await hmacKey(o.badSignature ? `${secret}x` : secret, "sign")
      const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(body)))
      const hex = [...sig].map((b) => b.toString(16).padStart(2, "0")).join("")
      const headers = new Map([[FAKE_SIGNATURE_HEADER, hex]])
      return { body, headers: { get: (name: string) => headers.get(name) ?? null } }
    },
  }
}
