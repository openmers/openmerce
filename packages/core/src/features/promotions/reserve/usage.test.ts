import { describeOnTargets } from "@openmers/test-utils"
import type Database from "better-sqlite3"
import { expect, it } from "vitest"
import { sqlitePlatform } from "../../__testing__/sqlitePlatform"
import { loadPromotions } from "../queries/loadPromotions"
import { compilePromotions } from "../registry/compilePromotions"
import { collectRequirements } from "../requires/collectRequirements"
import { buildReleaseUsageStatements, buildUsageStatements } from "./buildUsageStatements"

const NOW = 1_700_000_000_000

function seed(db: Database.Database) {
  let n = 0
  const run = (sql: string, ...args: unknown[]) =>
    Number(db.prepare(sql).run(...args).lastInsertRowid)
  const channel = run(
    `INSERT INTO channels (public_id, code, default_currency, currencies, langs, created_at, updated_at)
     VALUES ('chn_1', 'c1', 'USD', '["USD"]', '["en"]', ?, ?)`,
    NOW,
    NOW,
  )
  const pm = run(
    `INSERT INTO payment_methods (code, name, position, handler_code, created_at, updated_at)
     VALUES ('pm', 'pm', 0, 'manual', ?, ?)`,
    NOW,
    NOW,
  )
  return {
    run,
    reservation: (status = "active") =>
      run(
        `INSERT INTO checkout_reservations (public_id, cart_id, channel_id, snapshot,
           payment_method_id, status, expires_at, created_at, updated_at)
         VALUES (?, 0, ?, '{}', ?, ?, ?, ?, ?)`,
        `rsv_${++n}`,
        channel,
        pm,
        status,
        NOW,
        NOW,
        NOW,
      ),
    customer: () =>
      run(
        `INSERT INTO customers (public_id, email, email_normalized, source, created_at, updated_at)
         VALUES (?, ?, ?, 'checkout', ?, ?)`,
        `cus_${++n}`,
        `c${n}@example.com`,
        `c${n}@example.com`,
        NOW,
        NOW,
      ),
    promotion: (usageLimit: number | null, perCustomerLimit: number | null = null) =>
      run(
        `INSERT INTO promotions (public_id, name, enabled, priority, usage_limit, per_customer_limit,
           conditions, actions, stackable, created_at, updated_at)
         VALUES (?, 'P', 1, 0, ?, ?, '[{"code":"firstOrder","args":{}}]',
           '[{"code":"linePercent","args":{"bp":1000}}]', 1, ?, ?)`,
        `prm_${++n}`,
        usageLimit,
        perCustomerLimit,
        NOW,
        NOW,
      ),
    channel,
  }
}

describeOnTargets("promosyon kullanım ifadeleri", (getDb) => {
  const used = (id: number) =>
    getDb().prepare("SELECT used FROM promotions WHERE id = ?").pluck().get(id)
  const usageRows = () =>
    getDb().prepare("SELECT count(*) FROM promotion_usage").pluck().get() as number

  it("son kupona iki rezervasyon: tek kazanan", async () => {
    const p = sqlitePlatform(getDb())
    const s = seed(getDb())
    const promo = s.promotion(1)
    const results = [{ promotionId: promo, effective: true }]
    const reserve = (reservationId: number) =>
      p.atomic(
        buildUsageStatements({ results, reservationId, customerId: null, now: NOW }).statements,
      )

    expect(await reserve(s.reservation())).toEqual([1, 1])
    expect(await reserve(s.reservation())).toEqual([0, 0])
    expect(used(promo)).toBe(1)
    expect(usageRows()).toBe(1)
  })

  it("etkisiz promosyon sayaç tüketmez; aktif olmayan rezervasyon yazmaz", async () => {
    const p = sqlitePlatform(getDb())
    const s = seed(getDb())
    const promo = s.promotion(1)
    const none = buildUsageStatements({
      results: [{ promotionId: promo, effective: false }],
      reservationId: s.reservation(),
      customerId: null,
      now: NOW,
    })
    expect(none.statements).toEqual([])
    const results = [{ promotionId: promo, effective: true }]
    const expired = s.reservation("expired")
    const st = buildUsageStatements({ results, reservationId: expired, customerId: null, now: NOW })
    expect(await p.atomic(st.statements)).toEqual([0, 0])
    expect(used(promo)).toBe(0)
  })

  it("ya hep ya hiç: biri tükenmişse hiçbiri sayılmaz", async () => {
    const p = sqlitePlatform(getDb())
    const s = seed(getDb())
    const open = s.promotion(null)
    const done = s.promotion(0)
    const st = buildUsageStatements({
      results: [
        { promotionId: open, effective: true },
        { promotionId: done, effective: true },
      ],
      reservationId: s.reservation(),
      customerId: null,
      now: NOW,
    })
    expect(st.expected).toBe(2)
    expect(await p.atomic(st.statements)).toEqual([0, 0])
    expect(used(open)).toBe(0)
  })

  it("ters ifade sayacı geri alır; ikinci bırakma etkisiz", async () => {
    const p = sqlitePlatform(getDb())
    const s = seed(getDb())
    const promo = s.promotion(1)
    const rsv = s.reservation()
    const results = [{ promotionId: promo, effective: true }]
    await p.atomic(
      buildUsageStatements({ results, reservationId: rsv, customerId: null, now: NOW }).statements,
    )
    expect(await p.atomic(buildReleaseUsageStatements(rsv))).toEqual([1, 1])
    expect(used(promo)).toBe(0)
    expect(await p.atomic(buildReleaseUsageStatements(rsv))).toEqual([0, 0])
    // kupon yeniden kullanılabilir
    const again = buildUsageStatements({
      results,
      reservationId: s.reservation(),
      customerId: null,
      now: NOW,
    })
    expect(await p.atomic(again.statements)).toEqual([1, 1])
  })

  it("müşteri başına sınır; misafirde uygulanmaz", async () => {
    const p = sqlitePlatform(getDb())
    const s = seed(getDb())
    const promo = s.promotion(null, 1)
    const cus = s.customer()
    const results = [{ promotionId: promo, effective: true }]
    const reserve = (customerId: number | null) =>
      p.atomic(
        buildUsageStatements({ results, reservationId: s.reservation(), customerId, now: NOW })
          .statements,
      )
    expect(await reserve(cus)).toEqual([1, 1])
    expect(await reserve(cus)).toEqual([0, 0])
    expect(await reserve(s.customer())).toEqual([1, 1])
    expect(await reserve(null)).toEqual([1, 1])
    expect(used(promo)).toBe(3)
  })

  it("aynı rezervasyona ikinci yazım benzersiz indekse takılır (çifte sayım yok)", async () => {
    const p = sqlitePlatform(getDb())
    const s = seed(getDb())
    const promo = s.promotion(null)
    const rsv = s.reservation()
    const st = buildUsageStatements({
      results: [{ promotionId: promo, effective: true }],
      reservationId: rsv,
      customerId: null,
      now: NOW,
    })
    await p.atomic(st.statements)
    await expect(p.atomic(st.statements)).rejects.toThrow(/UNIQUE/)
    expect(used(promo)).toBe(1)
  })

  it("loadPromotions + derleme + requires sorgusu tek batch'te", async () => {
    const p = sqlitePlatform(getDb())
    const s = seed(getDb())
    const promo = s.promotion(null)
    s.run(
      "INSERT INTO promotion_channels (promotion_id, channel_id, created_at) VALUES (?, ?, ?)",
      promo,
      s.channel,
      NOW,
    )
    const { rows, links } = await loadPromotions(p)
    const { byChannel, invalid } = compilePromotions(rows, links)
    expect(invalid).toEqual([])
    const list = byChannel.get(s.channel) ?? []
    expect(list.map((x) => x.id)).toEqual([promo])

    const req = collectRequirements(p, list, { customerId: s.customer() })
    expect(req.queries).toHaveLength(1)
    expect(req.read(await p.batch(req.queries))).toEqual({ customerOrderCount: 0 })
    expect(collectRequirements(p, list, { customerId: null }).queries).toEqual([])
  })
})
