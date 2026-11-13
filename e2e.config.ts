import { web } from "@e2e-dev/web"
import type { E2EConfig } from "e2e"
import { opencodeConsole } from "e2e/oauth/opencode-console"

// Web hedefi. Mobil hedef: e2e.mobile.config.ts (`pnpm test:e2e:mobile`).
// Model: `pnpm exec e2e login opencode-console` ile giriş; CI'da OPENCODE_API_KEY.
export default {
  tests: "e2e/**/*.e2e.ts",
  targets: [
    {
      engine: web(),
      app: {
        url: "http://127.0.0.1:4321",
        command: {
          executable: "pnpm",
          args: ["--filter", "@openmers/storefront-app", "dev"],
          log: ".e2e/logs/app.log",
        },
      },
    },
  ],
  agents: {
    default: {
      model: opencodeConsole("go/deepseek-v4.1-flash"),
      system: "You are a thorough QA agent. Verify every outcome on screen.",
    },
  },
} satisfies E2EConfig
