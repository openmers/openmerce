import { mobile } from "@e2e-dev/mobile"
import { mobileTools } from "@e2e-dev/mobile/tools"
import type { E2EConfig } from "e2e"
import { opencodeConsole } from "e2e/oauth/opencode-console"

const android = mobile({ platform: "android" })

// TODO: apps/mobile gelince paket adını (bundleId) gerçek değerle değiştir (şu an yer tutucu).
export default {
  tests: "apps/mobile/e2e/**/*.e2e.ts",
  targets: [{ engine: android, app: { bundleId: "com.openmers.app" } }],
  workers: 1,
  agents: {
    default: {
      model: opencodeConsole("go/deepseek-v4.1-flash"),
      tools: mobileTools(android),
    },
  },
} satisfies E2EConfig
