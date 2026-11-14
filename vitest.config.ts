import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

// Birim testleri dosyanın yanında (*.test.ts). Entegrasyon testleri integration-tests/ altında kendi yapılandırmasıyla.
// `packages/ui` React components are tested in jsdom; other packages stay in Node.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
          exclude: ["packages/ui/**", "**/node_modules/**", "**/dist/**"],
        },
      },
      // Sözleşme testleri gerçek migration'lı SQLite'ta koşar (Node); `unit` yalnız packages/ ve apps/ tarar.
      {
        test: {
          name: "contract",
          include: ["integration-tests/contract/__tests__/**/*.test.ts"],
        },
      },
      // HTTP'siz feature entegrasyon testleri: gerçek SQLite + migration'lar (Node).
      {
        test: {
          name: "core",
          include: ["integration-tests/core/__tests__/**/*.test.ts"],
        },
      },
      {
        plugins: [react()],
        test: {
          name: "ui",
          environment: "jsdom",
          include: ["packages/ui/**/*.test.{ts,tsx}"],
          setupFiles: ["packages/ui/src/test/setup.ts"],
        },
      },
    ],
  },
})
