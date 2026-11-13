import { oc } from "@orpc/contract"
import { openapi } from "@orpc/openapi"
import { z } from "zod"

/**
 * `shop.health`: the first endpoint, proving the skeleton works end to end (`02-api-ve-istek-baglami` §8.9).
 * It is a cacheable GET; the returned `channel` is the code of the channel resolved for the request (the
 * anonymous path does not hit the database). No internal id is returned.
 */
export const shopHealthOutput = z.object({
  ok: z.literal(true),
  channel: z.string(),
})

export const shopHealth = oc
  .meta(openapi({ method: "GET", path: "/health" }))
  .output(shopHealthOutput)
