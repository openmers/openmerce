import { type SQL, sql } from "drizzle-orm"
import { type AtomicStatement, sqlStatement } from "../../../platform"

export type UsageInput = {
  /** `applyPromotions` sonuçları; yalnız `effective` olanlar sayaç tüketir. */
  results: readonly { promotionId: number; effective: boolean }[]
  /** Aynı `atomic()`'te yazılan rezervasyon: kimlik ya da kimliği veren alt sorgu. */
  reservationId: number | SQL
  /** Bilinmiyorsa müşteri başına sınır uygulanmaz. */
  customerId: number | null
  now: number
}

export type UsageStatements = {
  /** `[INSERT promotion_usage, UPDATE promotions]`; etkili promosyon yoksa boş. */
  statements: AtomicStatement[]
  /** İlk ifadenin tutması gereken satır sayısı (etkili promosyon sayısı). */
  expected: number
  /** Çağıranın kendi koşullu satırları için aynı "bütün sınırlar tutuyor" koşulu. */
  guard: SQL
}

function assertId(value: number, what: string): void {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${what} pozitif tamsayı olmalı`)
}

/**
 * Rezervasyon `atomic()`'i için kullanım ifadeleri (08-promosyon §3, 02-ticaret `promotion_usage`).
 * **Ya hep ya hiç, hata vermeden** (stok rezervasyonuyla aynı desen): `G` bütün etkili
 * promosyonların koşulunu (rezervasyon `active`, `usage_limit IS NULL OR used < usage_limit`,
 * müşteri başına sınır) tek, dış satıra bağlı olmayan alt sorguda toplar; `INSERT ... SELECT ...
 * WHERE G` bir kez değerlendirilir ve ya her promosyona birer satır ya hiç yazar. Ardından
 * `used + 1` yalnız bu rezervasyonun kullanım satırı olan promosyonlarda artar: ilk ifade 0 satır
 * yazdıysa ikinci de 0. Aynı rezervasyon için ikinci çağrı benzersiz `(promotion_id,
 * reservation_id)` indeksine takılır ve `atomic()`'in tamamı geri alınır (çifte sayım yok).
 *
 * Müşteri başına sınır: `count(promotion_usage WHERE customer_id) < per_customer_limit`, aynı
 * `G` içinde (02-ticaret kararı). Sayılan satırlar açık rezervasyonlar + siparişe dönmüşlerdir;
 * bırakılan rezervasyonun satırı silindiği için sayılmaz.
 */
export function buildUsageStatements(input: UsageInput): UsageStatements {
  const ids = [...new Set(input.results.filter((r) => r.effective).map((r) => r.promotionId))]
  ids.forEach((id) => {
    assertId(id, "promosyon kimliği")
  })
  if (typeof input.reservationId === "number") assertId(input.reservationId, "rezervasyon kimliği")
  if (input.customerId !== null) assertId(input.customerId, "müşteri kimliği")
  if (ids.length === 0) return { statements: [], expected: 0, guard: sql`1 = 1` }

  const idList = sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  )
  const res = input.reservationId
  const customer = input.customerId
  const perCustomer =
    customer === null
      ? sql`1 = 1`
      : sql`(g."per_customer_limit" IS NULL OR (SELECT count(*) FROM "promotion_usage" u
          WHERE u."promotion_id" = g."id" AND u."customer_id" = ${customer}) < g."per_customer_limit")`
  const guard = sql`EXISTS (SELECT 1 FROM "checkout_reservations" r
      WHERE r."id" = ${res} AND r."status" = 'active')
    AND (SELECT count(*) FROM "promotions" g WHERE g."id" IN (${idList})
      AND (g."usage_limit" IS NULL OR g."used" < g."usage_limit") AND ${perCustomer}) = ${ids.length}`

  const insert = sqlStatement(sql`INSERT INTO "promotion_usage"
      ("promotion_id", "customer_id", "reservation_id", "created_at")
      SELECT src."id", ${customer}, ${res}, ${input.now} FROM "promotions" src
      WHERE src."id" IN (${idList}) AND ${guard}`)
  const update = sqlStatement(sql`UPDATE "promotions" SET "used" = "used" + 1
      WHERE "id" IN (${idList}) AND EXISTS (SELECT 1 FROM "promotion_usage" u
        WHERE u."promotion_id" = "promotions"."id" AND u."reservation_id" = ${res})`)
  return { statements: [insert, update], expected: ids.length, guard }
}

/**
 * Bırakmada ters ifadeler: `used − 1` yalnız bu rezervasyonun (siparişe dönmemiş) kullanım satırı
 * olan promosyonlarda, sonra satırlar silinir. İkinci bırakma etkisizdir (satır kalmadı).
 */
export function buildReleaseUsageStatements(reservationId: number | SQL): AtomicStatement[] {
  if (typeof reservationId === "number") assertId(reservationId, "rezervasyon kimliği")
  const mine = sql`"promotion_usage" u WHERE u."reservation_id" = ${reservationId}
    AND u."order_id" IS NULL`
  return [
    sqlStatement(sql`UPDATE "promotions" SET "used" = "used" - 1
      WHERE "id" IN (SELECT u."promotion_id" FROM ${mine})`),
    sqlStatement(sql`DELETE FROM "promotion_usage" WHERE "id" IN (SELECT u."id" FROM ${mine})`),
  ]
}
