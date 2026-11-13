import { getHealth } from "./shop/health/get"

/**
 * Uygulanan router: sözleşmeyle aynı biçimde. `createRouterClient(router, { context })` storefront
 * SSR'da aynı süreçte HTTP'ye çıkmadan çağırır (`02-api-ve-istek-baglami` §11); istemci fabrikası
 * bu maddenin kapsamı dışındadır.
 */
export const router = {
  shop: { health: getHealth },
  admin: {},
}

export type ApiRouter = typeof router
