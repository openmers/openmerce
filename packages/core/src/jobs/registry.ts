import type { OutboxKind } from "../features/outbox"
import type { JobHandler, JobHandlers } from "./types"

/** Kaydı dondurur ve boş topic adını reddeder; feature'lar kendi handler'larını böyle tanımlar. */
export function defineHandlers(handlers: JobHandlers): JobHandlers {
  for (const [topic, handler] of Object.entries(handlers)) {
    if (topic.trim() === "") throw new RangeError("handler topic'i boş olamaz")
    if (typeof handler !== "function") throw new TypeError(`handler fonksiyon değil: ${topic}`)
  }
  return Object.freeze({ ...handlers })
}

/**
 * Satırın topic'i: olay adı varsa o (`order.placed`), yoksa iş türü (`notify`, `reindex`).
 * Katalog 01 `outbox.event` sütunu olay adını taşır; tür `kind`'dadır.
 */
export function topicOf(row: { event?: string | null; kind: OutboxKind }): string {
  return row.event ?? row.kind
}

export function handlerFor(handlers: JobHandlers, topic: string): JobHandler | undefined {
  return Object.hasOwn(handlers, topic) ? handlers[topic] : undefined
}
