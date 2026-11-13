import type * as schema from "@openmers/db"
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core"
import type { AtomicResult, AtomicStatement } from "./atomic"
import type { Cache, Enqueue, Images, Purge, RateLimit, Storage } from "./ports"

/** D1 (async) ve better-sqlite3 (sync) Drizzle örneklerinin ortak tipi; core her çağrıyı `await` eder. */
export type Db = BaseSQLiteDatabase<"sync" | "async", unknown, typeof schema>

/** Bir satır dizisi; sütun adları veritabanındaki gibi (snake_case). */
export type BatchRows = Record<string, unknown>[]

/** `apps/api` açılışta hedefe göre tek bir `Platform` kurar; core yalnız bunu görür (01-platform-arayuzu). */
export type Platform = {
  /** Yazma + tutarlı okuma. */
  db: Db
  /** Vitrin okumaları: D1 okuma oturumu / salt-okunur ikinci bağlantı. */
  readDb: Db
  /** Hepsi ya da hiçbiri; ifadeler sırayla, koşullu. Dönüş her ifadenin etkilediği satır sayısı. */
  atomic(stmts: readonly AtomicStatement[]): Promise<AtomicResult>
  /** Bağımsız okumalar tek turda (D1) / sırayla (self-host); sorgu sırasıyla satırlar. */
  batch(queries: readonly AtomicStatement[]): Promise<BatchRows[]>
  storage: Storage
  cache: Cache
  purge: Purge
  enqueue: Enqueue
  rateLimit: RateLimit
  /** `kek` yoksa kasa uykuda (madde 11). */
  secrets: { kek?: CryptoKey | string }
  /** Binding / `sharp` yoksa yok. */
  images?: Images
}
