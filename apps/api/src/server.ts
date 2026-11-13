import { serve } from "@hono/node-server"
import {
  catalogIndexHandlers,
  createChannelRegistry,
  defineHandlers,
  getSettingsVersion,
  loadChannels,
} from "@openmers/core"
import { createApp } from "./app"
import { readEnv } from "./platform/env"
import { createNodePlatform } from "./platform/node"
import { openNodeSqlite } from "./platform/node/sqlite"
import { createPoller } from "./worker/poller"

// Node entry point (`01-platform-arayuzu` §11): env → Platform → app.
// Modes (same document): `--worker` is only the job consumer; without flags, API + an in-process consumer.
// Migrations are assumed to be applied (item 6.10 runner; deploy/docker/entrypoint.sh).
const env = readEnv()
const workerOnly = process.argv.includes("--worker")
const sqlite = openNodeSqlite(env.OPENMERS_DB)
const platform = createNodePlatform({ sqlite, kek: env.OPENMERS_KEK })

// Handlers arrive with their own features; unregistered topics become `failed`.
const poller = createPoller({
  platform,
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
        fetch: createApp({ platform, channels, authSecret: env.OPENMERS_AUTH_SECRET }).fetch,
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
