import { svelte } from "@sveltejs/vite-plugin-svelte"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

export default defineConfig({ root: import.meta.dirname, plugins: [tailwindcss(), svelte()] })
