import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

// Static SPA: one HTML shell, no SSR. In dev, `/rpc` is proxied to the API so session cookies stay same-origin.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, "OPENMERS_")
  return {
    root: import.meta.dirname,
    plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), tailwindcss(), react()],
    server: {
      proxy: {
        "/rpc": { target: env.OPENMERS_API_ORIGIN ?? "http://localhost:3000", changeOrigin: true },
      },
    },
  }
})
