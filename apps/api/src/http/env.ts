import type { ApiInitialContext } from "../orpc/base"

/** Hono variables: the request id is set in the outermost middleware, the channel context after it. */
export type AppEnv = {
  Variables: {
    requestId: string
    /** Code of the resolved channel; used for the rate limit bucket. */
    channel: string
    apiContext: ApiInitialContext
  }
}
