import { SmartCoercionHandlerPlugin } from "@orpc/json-schema"
import { OpenAPIGenerator } from "@orpc/openapi"
import { OpenAPIHandler } from "@orpc/openapi/fetch"
import { RPCHandler } from "@orpc/server/fetch"
import { ZodToJsonSchemaConverter } from "@orpc/zod"
import { router } from "../router"
import { errorStatusMap } from "./base"

const converters = [new ZodToJsonSchemaConverter()]

/** RPC: yalnız yazma/kişiye özel çağrılar; GET varsayılan olarak reddedilir (CSRF). */
export const rpcHandler = new RPCHandler(router, { errorStatusMap })

/** OpenAPI: önbelleklenebilir GET uçları; Smart Coercion yalnız burada açık. */
export const openApiHandler = new OpenAPIHandler(router, {
  errorStatusMap,
  plugins: [new SmartCoercionHandlerPlugin({ converters })],
})

let document: Promise<unknown> | undefined

/** `/api/openapi.json`: sözleşmeden üretilir, bir kez hesaplanır; üretim düşerse yeniden denenir. */
export function openApiDocument(): Promise<unknown> {
  document ??= new OpenAPIGenerator({ converters })
    .generate(router, {
      version: "3.1.0",
      errorStatusMap,
      base: { info: { title: "OpenMers API", version: "0.0.0" } },
    })
    .catch((error: unknown) => {
      document = undefined
      throw error
    })
  return document
}
