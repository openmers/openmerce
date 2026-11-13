import type { OutboxKind } from "../features/outbox"
import type { JobHandler, JobHandlers } from "./types"

/** Freezes the registry and rejects empty topic names; features define their handlers this way. */
export function defineHandlers(handlers: JobHandlers): JobHandlers {
  for (const [topic, handler] of Object.entries(handlers)) {
    if (topic.trim() === "") throw new RangeError("handler topic'i boş olamaz")
    if (typeof handler !== "function") throw new TypeError(`handler fonksiyon değil: ${topic}`)
  }
  return Object.freeze({ ...handlers })
}

/**
 * The row's topic: the event name if present (`order.placed`), otherwise the job kind (`notify`, `reindex`).
 * The catalog 01 `outbox.event` column carries the event name; the kind is in `kind`.
 */
export function topicOf(row: { event?: string | null; kind: OutboxKind }): string {
  return row.event ?? row.kind
}

export function handlerFor(handlers: JobHandlers, topic: string): JobHandler | undefined {
  return Object.hasOwn(handlers, topic) ? handlers[topic] : undefined
}
