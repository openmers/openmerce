import { serve } from "@hono/node-server"
import {
  catalogIndexHandlers,
  createChannelRegistry,
  defineHandlers,
  getSettingsVersion,
  loadChannels,
} from "@openmers/core"
import { createApp } from "./app"
import { createCommerceConfig } from "./commerce/config"
import { readEnv } from "./platform/env"
import { createNodePlatform } from "./platform/node"
import { openNodeSqlite } from "./platform/node/sqlite"
import { storageFromEnv } from "./platform/node/storage"
import { createPoller } from "./worker/poller"

// Node entry point (`01-platform-arayuzu` §11): env → Platform → app.
// Modes (same document): `--worker` is only the job consumer; without flags, API + an in-process consumer.
// Migrations are assumed to be applied (item 6.10 runner; deploy/docker/entrypoint.sh).
const env = readEnv()
const workerOnly = process.argv.includes("--worker")
const sqlite = openNodeSqlite(env.OPENMERS_DB)
const { storage, local } = storageFromEnv(env)
const platform = createNodePlatform({ sqlite, kek: env.OPENMERS_KEK, storage })

// One commerce configuration for API and worker (payment registry for sweep and reconcile).
const commerce = createCommerceConfig({ platform })

// Handlers arrive with their own features; unregistered topics become `failed`.
const poller = createPoller({
  platform,
  payments: async (now) => (await commerce.get(now)).payments,
  handlers: defineHandlers({ ...catalogIndexHandlers }),
  onError: (error) => console.error("iş turu hatası:", error),
})
poller.start()

const channels = createChannelRegistry({
  load: () => loadChannels(platform),
  // shortcut: the channel table version is the global settings version for now; per-channel counter sum in item 14.
  version: () => getSettingsVersion(platform.db),
  checkEveryMs: 30_000,
})

const server = workerOnly
  ? undefined
  : serve(
      {
        fetch: createApp({
          platform,
          channels,
          commerce,
          authSecret: env.OPENMERS_AUTH_SECRET,
          localStorage: local,
        }).fetch,
        port: env.PORT,
      },
      (info) => console.log(`openmers api http://localhost:${info.port}`),
    )

if (workerOnly) console.log("openmers iş tüketicisi (--worker)")

// Graceful shutdown: the running batch finishes, then connections close.
let closing = false
async function shutdown(): Promise<void> {
  if (closing) return
  closing = true
  server?.close()
  await poller.stop()
  platform.close()
}

process.on("SIGTERM", () => void shutdown())
process.on("SIGINT", () => void shutdown())
