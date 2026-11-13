import type { OutboxKind } from "../features/outbox"
import type { Platform } from "../platform"

/** Outbox satırının tüketiciye görünen hâli; `payload` küçüktür (kimlikler + değişen alanlar). */
export type OutboxJob = {
  id: number
  publicId: string
  kind: OutboxKind
  /** `event ?? kind`; handler kaydının anahtarı. */
  topic: string
  payload: Record<string, unknown>
  /** Bu denemeden önceki sayı (markFailed +1 yazar). */
  attempts: number
}

export type JobContext = {
  platform: Platform
  /** Turun saati; iş içinde `Date.now()` çağrılmaz. */
  now: number
}

/** İşi yapan fonksiyon. Hata fırlatırsa satır `failed` olur; idempotent olmak zorundadır. */
export type JobHandler = (job: OutboxJob, ctx: JobContext) => Promise<void> | void

/** `topic → handler`. Kayıtsız topic `failed` olur (bilinmeyen iş sessizce yutulmaz). */
export type JobHandlers = Readonly<Record<string, JobHandler>>

/** Bir turun sayaçları. `dead` = deneme sınırına ulaşan satır (10. deneme). */
export type OutboxRunCounters = {
  claimed: number
  sent: number
  failed: number
  dead: number
}
