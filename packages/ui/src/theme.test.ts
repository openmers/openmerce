import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

const uiRoot = join(process.cwd(), "packages/ui")
const tailwind = join(uiRoot, "../../node_modules/.bin/tailwindcss")

let dir: string
let css: string

beforeAll(() => {
  dir = mkdtempSync(join(uiRoot, ".tailwind-"))
  const input = join(dir, "input.css")
  writeFileSync(
    input,
    [
      '@import "tailwindcss";',
      '@import "../src/theme.css";',
      '@source inline("bg-card text-foreground shadow-buttons-neutral transition-fg dark:bg-card");',
    ].join("\n"),
  )
  execFileSync(tailwind, ["-i", input, "-o", join(dir, "output.css")], { cwd: uiRoot })
  css = readFileSync(join(dir, "output.css"), "utf8")
})

afterAll(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe("theme.css", () => {
  it("compiles the token utility classes with Tailwind 4", () => {
    expect(css).toContain(".bg-card")
    expect(css).toContain("background-color: var(--card)")
    expect(css).toContain(".text-foreground")
    expect(css).toContain("color: var(--foreground)")
    expect(css).toContain(".shadow-buttons-neutral")
    expect(css).toContain(".transition-fg")
    expect(css).toContain(
      "transition-property: color, background-color, border-color, box-shadow, opacity",
    )
  })

  it("supports both dark mode selectors", () => {
    expect(css).toContain(".dark")
    expect(css).toContain('[data-mode="dark"]')
    expect(css).toContain('.dark\\:bg-card:where(.dark, .dark *, [data-mode="dark"]')
  })
})
