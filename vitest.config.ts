import { defineConfig } from "vitest/config"

// Birim testleri dosyanın yanında (*.test.ts). Entegrasyon testleri integration-tests/ altında kendi yapılandırmasıyla.
export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
})
