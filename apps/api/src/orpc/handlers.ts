import { SmartCoercionHandlerPlugin } from "@orpc/json-schema"
import { OpenAPIGenerator } from "@orpc/openapi"
import { OpenAPIHandler } from "@orpc/openapi/fetch"
import { RPCHandler } from "@orpc/server/fetch"
import { ResponseHeadersHandlerPlugin } from "@orpc/server/plugins"
import { ZodToJsonSchemaConverter } from "@orpc/zod"
import { router } from "../router"
import { errorStatusMap } from "./base"

const converters = [new ZodToJsonSchemaConverter()]

/** RPC: only write/user-specific calls; GET is rejected by default (CSRF). */
export const rpcHandler = new RPCHandler(router, {
  errorStatusMap,
  // The session cookie (`Set-Cookie`) is written via `context.resHeaders`.
  plugins: [new ResponseHeadersHandlerPlugin()],
})

/** OpenAPI: cacheable GET endpoints; Smart Coercion is enabled only here. */
export const openApiHandler = new OpenAPIHandler(router, {
  errorStatusMap,
  plugins: [new SmartCoercionHandlerPlugin({ converters }), new ResponseHeadersHandlerPlugin()],
})

let document: Promise<unknown> | undefined

/** `/api/openapi.json`: generated from the contract and computed once; retried if generation fails. */
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
