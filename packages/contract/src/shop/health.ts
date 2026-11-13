import { oc } from "@orpc/contract"
import { openapi } from "@orpc/openapi"
import { z } from "zod"

/**
 * `shop.health`: iskeletin uçtan uca çalıştığını kanıtlayan ilk uç (`02-api-ve-istek-baglami` §8.9).
 * GET'tir ve önbelleklenebilir; dönen `channel` istekte çözülen kanalın kodudur (anonim yolda
 * veritabanına inilmez). İç kimlik dönmez.
 */
export const shopHealthOutput = z.object({
  ok: z.literal(true),
  channel: z.string(),
})

export const shopHealth = oc
  .meta(openapi({ method: "GET", path: "/health" }))
  .output(shopHealthOutput)
