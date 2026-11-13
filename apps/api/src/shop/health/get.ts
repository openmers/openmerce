import { base } from "../../orpc/base"

/**
 * `shop.health` (`02-api-ve-istek-baglami` §8.9): thin handler — no input, no permission (public),
 * not even a single `core` call. The channel comes from `Ctx`; an anonymous request costs zero database round trips.
 */
export const getHealth = base.shop.health.handler(({ context }) => ({
  ok: true as const,
  channel: context.ctx.channel.code,
}))
