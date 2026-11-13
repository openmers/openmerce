import { svelte } from "@sveltejs/vite-plugin-svelte"
import { svelteTesting } from "@testing-library/svelte/vite"
import { defineConfig } from "vitest/config"

// Birim testleri dosyanın yanında (*.test.ts). Entegrasyon testleri integration-tests/ altında kendi yapılandırmasıyla.
// `packages/ui` .svelte bileşenlerini jsdom'da test eder; diğer paketler Node ortamında kalır.
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
      {
        plugins: [svelte(), svelteTesting()],
        resolve: { conditions: ["browser"] },
        // bits-ui ve svelte-sonner `.svelte` dosyası taşır; SSR dışlaması kapatılmazsa Node onları çözemez.
        ssr: { noExternal: ["@lucide/svelte", "bits-ui", "runed", "svelte-sonner"] },
        test: {
          name: "ui",
          environment: "jsdom",
          include: ["packages/ui/**/*.test.ts"],
          setupFiles: ["packages/ui/src/test/setup.ts"],
        },
      },
    ],
  },
})
