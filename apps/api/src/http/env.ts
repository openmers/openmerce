import type { ApiInitialContext } from "../orpc/base"

/** Hono değişkenleri: istek kimliği en dış ara katmanda yazılır, kanal bağlamı ondan sonra. */
export type AppEnv = {
  Variables: {
    requestId: string
    apiContext: ApiInitialContext
  }
}
