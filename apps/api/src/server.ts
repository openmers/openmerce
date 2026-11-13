import { serve } from "@hono/node-server"
import { createChannelRegistry, getSettingsVersion, loadChannels } from "@openmers/core"
import { createApp } from "./app"
import { readEnv } from "./platform/env"
import { createNodePlatform } from "./platform/node"
import { openNodeSqlite } from "./platform/node/sqlite"

// Node giriş noktası (`01-platform-arayuzu` §11): env → Platform → uygulama.
// Migration'lar uygulanmış varsayılır (madde 6.10 çalıştırıcısı; deploy/docker/entrypoint.sh).
const env = readEnv()
const sqlite = openNodeSqlite(env.OPENMERS_DB)
const platform = createNodePlatform({ sqlite, kek: env.OPENMERS_KEK })

const channels = createChannelRegistry({
  load: () => loadChannels(platform),
  // shortcut: kanal tablosu sürümü şimdilik global ayar sürümü; kanal başına sayaç toplamı madde 14.
  version: () => getSettingsVersion(platform.db),
  checkEveryMs: 30_000,
})

const app = createApp({ platform, channels })

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`openmers api http://localhost:${info.port}`)
})

function shutdown(): void {
  server.close()
  platform.close()
}

process.on("SIGTERM", shutdown)
process.on("SIGINT", shutdown)
