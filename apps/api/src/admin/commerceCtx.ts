import type { Ctx } from "@openmers/core"
import type { ApiContext } from "../orpc/base"

type Context = { ctx: Ctx } & Pick<ApiContext, "commerce" | "now">

/** Admin write context (audit actor + channel) and the payment method lookup. */
export async function adminCtx(context: Context) {
  const config = await context.commerce.get(context.now)
  const { ctx } = context
  return {
    ctx: {
      platform: ctx.platform,
      now: ctx.now,
      actor: ctx.actor,
      requestId: ctx.requestId,
      channelId: ctx.channel.id,
    },
    methodOf: (id: number) => config.payments.all().find((m) => m.id === id),
  }
}
