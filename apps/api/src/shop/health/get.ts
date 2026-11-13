import { base } from "../../orpc/base"

/**
 * `shop.health` (`02-api-ve-istek-baglami` §8.9): ince handler — girdi yok, izin yok (herkese açık),
 * tek `core` çağrısı bile yok. Kanal `Ctx`'ten gelir; anonim istek sıfır veritabanı turudur.
 */
export const getHealth = base.shop.health.handler(({ context }) => ({
  ok: true as const,
  channel: context.ctx.channel.code,
}))
