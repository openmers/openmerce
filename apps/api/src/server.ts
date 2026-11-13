import { serve } from "@hono/node-server"
import {
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

// Node giriş noktası (`01-platform-arayuzu` §11): env → Platform → uygulama.
// Kipler (aynı belge): `--worker` yalnız iş tüketicisi, bayraksız API + aynı süreçte tüketici.
// Migration'lar uygulanmış varsayılır (madde 6.10 çalıştırıcısı; deploy/docker/entrypoint.sh).
const env = readEnv()
const workerOnly = process.argv.includes("--worker")
const sqlite = openNodeSqlite(env.OPENMERS_DB)
const platform = createNodePlatform({ sqlite, kek: env.OPENMERS_KEK })

// Gerçek handler'lar kendi feature'larıyla gelir (brif kapsamı dışı); kayıtsız topic `failed` olur.
const poller = createPoller({
  platform,
  handlers: defineHandlers({}),
  onError: (error) => console.error("iş turu hatası:", error),
})
poller.start()

const channels = createChannelRegistry({
  load: () => loadChannels(platform),
  // shortcut: kanal tablosu sürümü şimdilik global ayar sürümü; kanal başına sayaç toplamı madde 14.
  version: () => getSettingsVersion(platform.db),
  checkEveryMs: 30_000,
})

const server = workerOnly
  ? undefined
  : serve({ fetch: createApp({ platform, channels }).fetch, port: env.PORT }, (info) =>
      console.log(`openmers api http://localhost:${info.port}`),
    )

if (workerOnly) console.log("openmers iş tüketicisi (--worker)")

// Düzgün kapanış: süren parti biter, sonra bağlantılar kapanır.
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
