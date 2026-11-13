import { defineConfig } from "drizzle-kit"

// Yalnız üretim (generate/check) için; uygulama wrangler ve Node çalıştırıcıdadır (04-asama-1-db-plani §1.3).
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/schema/index.ts",
  out: "./migrations",
})
